'use server';
import type { Member, MemberDocument, GDI, GDIDocument, MinistryArea, MinistryAreaDocument } from '@/lib/types';
import {
  findDocuments,
  findOneDocument,
  insertOneDocument,
  updateOneDocument,
  updateManyDocuments,
  deleteOneDocument,
  countDocuments,
  withTransaction
} from '@/lib/db-utils';
import { toObjectId, toObjectIds } from '@/lib/id-utils';
import { calculateMemberRoles } from '@/lib/roleUtils';
import { Filter, ObjectId } from 'mongodb';
import { deleteAttendanceForMember } from './attendanceService';
import { deleteTithesForMember } from './titheService';

const MEMBERS_COLLECTION = 'members';
const GDIS_COLLECTION = 'gdis';
const MINISTRY_AREAS_COLLECTION = 'ministry-areas';

// ============================================
// READ OPERATIONS
// ============================================

export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFilters?: string[],
  roleFilters?: string[],
  guideFilters?: string[],
  areaFilters?: string[],
): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  const query: Filter<MemberDocument> = {};

  // Status filter
  if (memberStatusFilters && memberStatusFilters.length > 0) {
    query.status = { $in: memberStatusFilters as any };
  }

  // Search term filter
  if (searchTerm) {
    const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
    query.$or = [
      { firstName: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { lastName: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { email: { $regex: lowercasedSearchTerm, $options: 'i' } },
      { phone: { $regex: lowercasedSearchTerm, $options: 'i' } },
    ];
  }

  // Role filter
  if (roleFilters && roleFilters.length > 0) {
    const NO_ROLE_FILTER_VALUE = 'NO_ROLE';
    if (roleFilters.includes(NO_ROLE_FILTER_VALUE)) {
      query.$or = [
        ...(query.$or || []),
        { roles: { $exists: false } },
        { roles: { $size: 0 } }
      ];
    } else {
      query.roles = { $in: roleFilters as any };
    }
  }

  // GDI filter
  if (guideFilters && guideFilters.length > 0) {
    const NO_GDI_FILTER_VALUE = 'NO_GDI';
    if (guideFilters.includes(NO_GDI_FILTER_VALUE)) {
      query.assignedGDIId = { $in: [null, undefined] } as any;
    } else {
      const guideObjectIds = toObjectIds(guideFilters);
      query.assignedGDIId = { $in: guideObjectIds } as any;
    }
  }

  // Area filter
  if (areaFilters && areaFilters.length > 0) {
    const NO_AREA_FILTER_VALUE = 'NO_AREA';
    if (areaFilters.includes(NO_AREA_FILTER_VALUE)) {
      query.$or = [
        ...(query.$or || []),
        { assignedAreaIds: { $exists: false } },
        { assignedAreaIds: { $size: 0 } }
      ];
    } else {
      const areaObjectIds = toObjectIds(areaFilters);
      query.assignedAreaIds = { $elemMatch: { $in: areaObjectIds } } as any;
    }
  }

  const totalMembers = await countDocuments(MEMBERS_COLLECTION, query);
  const totalPages = Math.ceil(totalMembers / pageSize);
  const skip = (page - 1) * pageSize;

  const members = await findDocuments<MemberDocument>(MEMBERS_COLLECTION, query, {
    sort: { firstName: 1, lastName: 1 },
    skip: skip,
    limit: pageSize,
  });

  return { members, totalMembers, totalPages };
}

export async function getAllMembersNonPaginated(): Promise<Member[]> {
  return findDocuments<MemberDocument>(MEMBERS_COLLECTION, {}, { sort: { firstName: 1, lastName: 1 } });
}

export async function getMemberById(id: string): Promise<Member | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  return findOneDocument<MemberDocument>(MEMBERS_COLLECTION, { _id: oid });
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function addMember(memberData: Omit<Member, 'id'>): Promise<Member> {
  const allGdis = await findDocuments<GDIDocument>(GDIS_COLLECTION);
  const allMinistryAreas = await findDocuments<MinistryAreaDocument>(MINISTRY_AREAS_COLLECTION);

  // Calculate roles based on assignments
  const tempMemberForRoleCalc = {
    id: new ObjectId().toHexString(),
    assignedGDIId: memberData.assignedGDIId,
    assignedAreaIds: memberData.assignedAreaIds,
  };

  const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);

  // Convert string IDs to ObjectIds for storage
  const memberDoc: Omit<MemberDocument, '_id'> = {
    ...memberData,
    assignedGDIId: toObjectId(memberData.assignedGDIId),
    assignedAreaIds: toObjectIds(memberData.assignedAreaIds),
    avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100',
    roles: calculatedRoles,
  };

  const insertedMember = await insertOneDocument<MemberDocument>(MEMBERS_COLLECTION, memberDoc);
  await addMemberToAssignments(insertedMember);

  return insertedMember;
}

export async function updateMember(memberId: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member | null> {
  const memberToUpdate = await getMemberById(memberId);
  if (!memberToUpdate) throw new Error(`Member with ID ${memberId} not found.`);

  const allGdis = await findDocuments<GDIDocument>(GDIS_COLLECTION);
  const allMinistryAreas = await findDocuments<MinistryAreaDocument>(MINISTRY_AREAS_COLLECTION);

  const updatedData: Member = { ...memberToUpdate, ...updates };

  // Recalculate roles
  const memberForRoleCalc = {
    id: memberToUpdate.id,
    assignedGDIId: updatedData.assignedGDIId,
    assignedAreaIds: updatedData.assignedAreaIds,
  };
  const calculatedRoles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);

  // Convert string IDs to ObjectIds for storage
  const finalUpdates: any = { ...updates };
  if (updates.assignedGDIId !== undefined) {
    finalUpdates.assignedGDIId = toObjectId(updates.assignedGDIId);
  }
  if (updates.assignedAreaIds !== undefined) {
    finalUpdates.assignedAreaIds = toObjectIds(updates.assignedAreaIds);
  }
  finalUpdates.roles = calculatedRoles;

  await updateMemberAssignments(memberId, memberToUpdate, updatedData);

  const oid = toObjectId(memberId);
  if (!oid) throw new Error('Invalid member ID');

  return updateOneDocument<MemberDocument>(MEMBERS_COLLECTION, { _id: oid }, { $set: finalUpdates });
}

/**
 * Delete member with transaction to ensure data consistency
 * Removes member from GDIs, ministry areas, and deletes related records
 */
export async function deleteMember(memberId: string): Promise<Member | null> {
  const memberOid = toObjectId(memberId);
  if (!memberOid) return null;

  const memberToDelete = await getMemberById(memberId);
  if (!memberToDelete) return null;

  // Use transaction for atomic deletion
  await withTransaction(async (session) => {
    // 1. Unassign from GDI
    if (memberToDelete.assignedGDIId) {
      const gdiOid = toObjectId(memberToDelete.assignedGDIId);
      if (gdiOid) {
        await updateOneDocument(
          GDIS_COLLECTION,
          { _id: gdiOid },
          { $pull: { memberIds: memberOid } as any },
          { session }
        );
      }
    }

    // 2. Unassign from Ministry Areas
    if (memberToDelete.assignedAreaIds && memberToDelete.assignedAreaIds.length > 0) {
      const areaOids = toObjectIds(memberToDelete.assignedAreaIds);
      if (areaOids.length > 0) {
        await updateManyDocuments(
          MINISTRY_AREAS_COLLECTION,
          { _id: { $in: areaOids } },
          { $pull: { memberIds: memberOid } as any },
          { session }
        );
      }
    }

    // 3. Delete related attendance records
    await deleteAttendanceForMember(memberId);

    // 4. Delete related tithe records
    await deleteTithesForMember(memberId);

    // 5. Finally, delete the member document
    await deleteOneDocument(MEMBERS_COLLECTION, { _id: memberOid }, { session });
  });

  return memberToDelete;
}

export async function bulkRecalculateAndUpdateRoles(memberIds: string[]): Promise<number> {
  if (!memberIds || memberIds.length === 0) return 0;

  const memberOids = toObjectIds(memberIds);
  if (memberOids.length === 0) return 0;

  const allGdis = await findDocuments<GDIDocument>(GDIS_COLLECTION);
  const allMinistryAreas = await findDocuments<MinistryAreaDocument>(MINISTRY_AREAS_COLLECTION);
  const membersToUpdate = await findDocuments<MemberDocument>(MEMBERS_COLLECTION, { _id: { $in: memberOids } });

  let updatedCount = 0;

  for (const member of membersToUpdate) {
    const calculatedRoles = calculateMemberRoles(member, allGdis, allMinistryAreas);
    const rolesChanged = JSON.stringify(calculatedRoles) !== JSON.stringify(member.roles);

    if (rolesChanged) {
      const memberOid = toObjectId(member.id);
      if (memberOid) {
        await updateOneDocument(MEMBERS_COLLECTION, { _id: memberOid }, { $set: { roles: calculatedRoles } });
        updatedCount++;
      }
    }
  }

  return updatedCount;
}

// ============================================
// HELPER FUNCTIONS FOR ASSIGNMENTS
// ============================================

export async function addMemberToAssignments(newMember: Member): Promise<void> {
  const memberOid = toObjectId(newMember.id);
  if (!memberOid) return;

  // Add to GDI
  if (newMember.assignedGDIId) {
    const gdiOid = toObjectId(newMember.assignedGDIId);
    if (gdiOid) {
      await updateOneDocument(
        GDIS_COLLECTION,
        { _id: gdiOid },
        { $addToSet: { memberIds: memberOid } as any }
      );
    }
  }

  // Add to Ministry Areas
  if (newMember.assignedAreaIds && newMember.assignedAreaIds.length > 0) {
    const areaOids = toObjectIds(newMember.assignedAreaIds);
    if (areaOids.length > 0) {
      await updateManyDocuments(
        MINISTRY_AREAS_COLLECTION,
        { _id: { $in: areaOids } },
        { $addToSet: { memberIds: memberOid } as any }
      );
    }
  }
}

export async function updateMemberAssignments(memberId: string, originalMember: Member, updatedMember: Member): Promise<void> {
  const memberOid = toObjectId(memberId);
  if (!memberOid) return;

  const oldGDI = originalMember.assignedGDIId;
  const newGDI = updatedMember.assignedGDIId;
  const oldAreas = new Set(originalMember.assignedAreaIds || []);
  const newAreas = new Set(updatedMember.assignedAreaIds || []);

  // Handle GDI changes
  if (oldGDI !== newGDI) {
    if (oldGDI) {
      const oldGdiOid = toObjectId(oldGDI);
      if (oldGdiOid) {
        await updateOneDocument(GDIS_COLLECTION, { _id: oldGdiOid }, { $pull: { memberIds: memberOid } as any });
      }
    }
    if (newGDI) {
      const newGdiOid = toObjectId(newGDI);
      if (newGdiOid) {
        await updateOneDocument(GDIS_COLLECTION, { _id: newGdiOid }, { $addToSet: { memberIds: memberOid } as any });
      }
    }
  }

  // Handle Ministry Area changes
  const areasRemoved = [...oldAreas].filter(areaId => !newAreas.has(areaId));
  const areasAdded = [...newAreas].filter(areaId => !oldAreas.has(areaId));

  if (areasRemoved.length > 0) {
    const removedOids = toObjectIds(areasRemoved);
    if (removedOids.length > 0) {
      await updateManyDocuments(
        MINISTRY_AREAS_COLLECTION,
        { _id: { $in: removedOids } },
        { $pull: { memberIds: memberOid } as any }
      );
    }
  }
  if (areasAdded.length > 0) {
    const addedOids = toObjectIds(areasAdded);
    if (addedOids.length > 0) {
      await updateManyDocuments(
        MINISTRY_AREAS_COLLECTION,
        { _id: { $in: addedOids } },
        { $addToSet: { memberIds: memberOid } as any }
      );
    }
  }
}
