'use server';
import type { MinistryArea, MinistryAreaWriteData } from '@/lib/types';
import { findDocuments, findOneDocument, insertOneDocument, updateOneDocument, updateManyDocuments, deleteOneDocument } from '@/lib/db-utils';
import { deleteMeetingSeriesForGroup } from './groupMeetingService';
import { ObjectId } from 'mongodb';

const MINISTRY_AREAS_COLLECTION = 'ministry-areas';
const MEMBERS_COLLECTION = 'members';

// --- Read Operations ---

export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  return findDocuments<MinistryArea>(MINISTRY_AREAS_COLLECTION, {}, { sort: { name: 1 } });
}

export async function getMinistryAreaById(id: string): Promise<MinistryArea | null> {
  return findOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, { _id: new ObjectId(id) });
}

// --- Write Operations ---

export async function addMinistryArea(areaData: MinistryAreaWriteData): Promise<MinistryArea> {
  const newArea: Omit<MinistryArea, 'id'> = {
    ...areaData,
    memberIds: areaData.memberIds || [],
  };

  const insertedArea = await insertOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, newArea);

  // Atomically assign this area to the new leader and members
  if (areaData.leaderId) {
    await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(areaData.leaderId) }, { $addToSet: { assignedAreaIds: insertedArea.id } as any });
  }
  const memberIdsToAssign = (areaData.memberIds || []).filter(id => id !== areaData.leaderId);
  if (memberIdsToAssign.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: memberIdsToAssign.map(id => new ObjectId(id)) } }, { $addToSet: { assignedAreaIds: insertedArea.id } as any });
  }

  return insertedArea;
}

export async function updateMinistryAreaAndSyncMembers(
  areaId: string,
  updates: Partial<Pick<MinistryArea, 'name' | 'description' | 'leaderId' | 'memberIds'>>
): Promise<MinistryArea | null> {
  const originalArea = await getMinistryAreaById(areaId);
  if (!originalArea) throw new Error(`Ministry Area with ID ${areaId} not found.`);

  // --- Sync Member and Leader Assignments ---
  const newLeaderId = updates.leaderId;
  const newMemberIds = new Set(updates.memberIds || []);
  const originalMemberIds = new Set(originalArea.memberIds || []);

  // 1. Handle Leader Change
  if (newLeaderId !== undefined && newLeaderId !== originalArea.leaderId) {
    // Demote old leader
    if (originalArea.leaderId) {
      await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(originalArea.leaderId) }, { $pull: { assignedAreaIds: areaId } as any });
    }
    // Promote new leader
    if (newLeaderId) {
      await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(newLeaderId) }, { $addToSet: { assignedAreaIds: areaId } as any });
    }
  }

  // 2. Handle Member List Changes
  const membersAdded = [...newMemberIds].filter(id => !originalMemberIds.has(id));
  const membersRemoved = [...originalMemberIds].filter(id => !newMemberIds.has(id));

  if (membersAdded.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: membersAdded.map(id => new ObjectId(id)) } }, { $addToSet: { assignedAreaIds: areaId } as any });
  }
  if (membersRemoved.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: membersRemoved.map(id => new ObjectId(id)) } }, { $pull: { assignedAreaIds: areaId } as any });
  }

  // --- Update Ministry Area Document ---
  const finalUpdateData: Partial<MinistryArea> = {};
  if (updates.name) finalUpdateData.name = updates.name;
  if (updates.description) finalUpdateData.description = updates.description;
  if (updates.leaderId !== undefined) finalUpdateData.leaderId = updates.leaderId;
  // Ensure the final member list doesn't include the leader
  if (updates.memberIds !== undefined) finalUpdateData.memberIds = updates.memberIds.filter(id => id !== newLeaderId);

  return updateOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, { _id: new ObjectId(areaId) }, { $set: finalUpdateData });
}

export async function deleteMinistryArea(areaId: string): Promise<boolean> {
  const areaToDelete = await getMinistryAreaById(areaId);
  if (!areaToDelete) throw new Error(`Ministry Area with ID ${areaId} not found.`);

  // 1. Unassign all members and the leader from this area
  const allAssignedIds = [areaToDelete.leaderId, ...areaToDelete.memberIds].filter(Boolean);
  if (allAssignedIds.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: allAssignedIds.map(id => new ObjectId(id)) } }, { $pull: { assignedAreaIds: areaId } as any });
  }

  // 2. Delete associated meeting series for this group
  await deleteMeetingSeriesForGroup(areaId);

  // 3. Delete the Ministry Area itself
  return deleteOneDocument(MINISTRY_AREAS_COLLECTION, { _id: new ObjectId(areaId) });
}