'use server';
import type { Member, MemberWriteData, GDI, MinistryArea } from '@/lib/types';
import { findDocuments, findOneDocument, insertOneDocument, updateOneDocument, deleteOneDocument, countDocuments, updateManyDocuments } from '@/lib/db-utils';
import { calculateMemberRoles } from '@/lib/roleUtils';
import { Filter, ObjectId } from 'mongodb';
import { deleteAttendanceForMember } from './attendanceService';
import { deleteTithesForMember } from './titheService';

const MEMBERS_COLLECTION = 'members';
const GDIS_COLLECTION = 'gdis';
const MINISTRY_AREAS_COLLECTION = 'ministry-areas';

// --- Read Operations ---

export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFilters?: string[],
): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  const query: Filter<any> = {};

  if (memberStatusFilters && memberStatusFilters.length > 0) {
    query.status = { $in: memberStatusFilters };
  }

  if (searchTerm) {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    query.$or = [
      { firstName: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { lastName: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { email: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { phone: { $regex: lowercasedSearchTerm, $options: 'i' } },
    ];
  }

  const totalMembers = await countDocuments(MEMBERS_COLLECTION, query);
  const totalPages = Math.ceil(totalMembers / pageSize);
  const skip = (page - 1) * pageSize;

  const members = await findDocuments<Member>(MEMBERS_COLLECTION, query, {
    sort: { firstName: 1, lastName: 1 },
    skip: skip,
    limit: pageSize,
  });

  return { members, totalMembers, totalPages };
}

export async function getAllMembersNonPaginated(): Promise<Member[]> {
  return findDocuments<Member>(MEMBERS_COLLECTION, {}, { sort: { firstName: 1, lastName: 1 } });
}

export async function getMemberById(id: string): Promise<Member | null> {
  return findOneDocument<Member>(MEMBERS_COLLECTION, { _id: new ObjectId(id) }); // Query by _id
}

// --- Write Operations ---

export async function addMember(memberData: MemberWriteData): Promise<Member> {
  const allGdis = await findDocuments<GDI>(GDIS_COLLECTION);
  const allMinistryAreas = await findDocuments<MinistryArea>(MINISTRY_AREAS_COLLECTION);

  const tempMemberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
    id: new ObjectId().toHexString(), // Placeholder for role calculation, will be replaced by actual _id
    assignedGDIId: memberData.assignedGDIId,
    assignedAreaIds: memberData.assignedAreaIds,
  };

  const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);

  const newMember: MemberWriteData = {
    ...memberData,
    avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100',
    roles: calculatedRoles,
  };

  const insertedMember = await insertOneDocument<Member>(MEMBERS_COLLECTION, newMember);
  await addMemberToAssignments(insertedMember);

  return insertedMember;
}

export async function updateMember(memberId: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member | null> {
  const memberToUpdate = await getMemberById(memberId);
  if (!memberToUpdate) throw new Error(`Member with ID ${memberId} not found.`);

  const allGdis = await findDocuments<GDI>(GDIS_COLLECTION);
  const allMinistryAreas = await findDocuments<MinistryArea>(MINISTRY_AREAS_COLLECTION);

  const updatedData: Member = { ...memberToUpdate, ...updates };

  const memberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
    id: memberToUpdate.id, // Use existing _id
    assignedGDIId: updatedData.assignedGDIId,
    assignedAreaIds: updatedData.assignedAreaIds,
  };
  const calculatedRoles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);

  const finalUpdates = {
    ...updates,
    roles: calculatedRoles,
  };

  await updateMemberAssignments(memberId, memberToUpdate, updatedData);

  return updateOneDocument<Member>(MEMBERS_COLLECTION, { _id: new ObjectId(memberId) }, { $set: finalUpdates });
}

export async function deleteMember(memberId: string): Promise<Member | null> {
  const memberToDelete = await getMemberById(memberId);
  if (!memberToDelete) {
    return null; // Member not found
  }

  // Unassign from GDI
  if (memberToDelete.assignedGDIId) {
    await updateOneDocument(GDIS_COLLECTION, { _id: new ObjectId(memberToDelete.assignedGDIId) }, { $pull: { memberIds: memberToDelete.id } as any });
  }
  // Unassign from Ministry Areas
  if (memberToDelete.assignedAreaIds && memberToDelete.assignedAreaIds.length > 0) {
    await updateManyDocuments(MINISTRY_AREAS_COLLECTION, { _id: { $in: memberToDelete.assignedAreaIds.map(id => new ObjectId(id)) } }, { $pull: { memberIds: memberToDelete.id } as any });
  }

  // Also delete related records for data integrity
  await deleteAttendanceForMember(memberToDelete.id);
  await deleteTithesForMember(memberToDelete.id);

  // Finally, delete the member document
  const wasDeleted = await deleteOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(memberId) });

  if (wasDeleted) {
    return memberToDelete; // Return the member object that was just deleted
  }

  return null; // Deletion failed
}

export async function bulkRecalculateAndUpdateRoles(memberIds: string[]): Promise<number> {
    if (!memberIds || memberIds.length === 0) return 0;

    const allGdis = await findDocuments<GDI>(GDIS_COLLECTION);
    const allMinistryAreas = await findDocuments<MinistryArea>(MINISTRY_AREAS_COLLECTION);
    const membersToUpdate = await findDocuments<Member>(MEMBERS_COLLECTION, { _id: { $in: memberIds.map(id => new ObjectId(id)) } });

    let updatedCount = 0;

    for (const member of membersToUpdate) {
        const calculatedRoles = calculateMemberRoles(member, allGdis, allMinistryAreas);
        const rolesChanged = JSON.stringify(calculatedRoles) !== JSON.stringify(member.roles);

        if (rolesChanged) {
            await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(member.id) }, { $set: { roles: calculatedRoles } });
            updatedCount++;
        }
    }

    return updatedCount;
}

// --- Helper Functions for Assignments ---

export async function addMemberToAssignments(newMember: Member): Promise<void> {
  if (newMember.assignedGDIId) {
    await updateOneDocument(
      GDIS_COLLECTION, 
      { _id: new ObjectId(newMember.assignedGDIId) }, 
      { $addToSet: { memberIds: newMember.id } as any }
    );
  }
  if (newMember.assignedAreaIds && newMember.assignedAreaIds.length > 0) {
    await updateManyDocuments(
      MINISTRY_AREAS_COLLECTION, 
      { _id: { $in: newMember.assignedAreaIds.map(id => new ObjectId(id)) } }, 
      { $addToSet: { memberIds: newMember.id } as any }
    );
  }
}

export async function updateMemberAssignments(memberId: string, originalMember: Member, updatedMember: Member): Promise<void> {
  const oldGDI = originalMember.assignedGDIId;
  const newGDI = updatedMember.assignedGDIId;
  const oldAreas = new Set(originalMember.assignedAreaIds || []);
  const newAreas = new Set(updatedMember.assignedAreaIds || []);

  if (oldGDI !== newGDI) {
    if (oldGDI) {
      await updateOneDocument(GDIS_COLLECTION, { _id: new ObjectId(oldGDI) }, { $pull: { memberIds: memberId } as any });
    }
    if (newGDI) {
      await updateOneDocument(GDIS_COLLECTION, { _id: new ObjectId(newGDI) }, { $addToSet: { memberIds: memberId } as any });
    }
  }

  const areasRemoved = [...oldAreas].filter(areaId => !newAreas.has(areaId));
  const areasAdded = [...newAreas].filter(areaId => !oldAreas.has(areaId));

  if (areasRemoved.length > 0) {
    await updateManyDocuments(MINISTRY_AREAS_COLLECTION, { _id: { $in: areasRemoved.map(id => new ObjectId(id)) } }, { $pull: { memberIds: memberId } as any });
  }
  if (areasAdded.length > 0) {
    await updateManyDocuments(MINISTRY_AREAS_COLLECTION, { _id: { $in: areasAdded.map(id => new ObjectId(id)) } }, { $addToSet: { memberIds: memberId } as any });
  }
}