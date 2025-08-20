
'use server';
import type { MinistryArea, MinistryAreaWriteData } from '@/lib/types';
import { findDocuments, findOneDocument, insertOneDocument, updateOneDocument, updateManyDocuments, deleteOneDocument } from '@/lib/db-utils';
import { deleteMeetingSeriesForGroup } from './groupMeetingService';

const MINISTRY_AREAS_COLLECTION = 'ministry-areas';
const MEMBERS_COLLECTION = 'members';

// --- Read Operations ---

export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  return findDocuments<MinistryArea>(MINISTRY_AREAS_COLLECTION, {}, { sort: { name: 1 } });
}

export async function getMinistryAreaById(id: string): Promise<MinistryArea | null> {
  return findOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, { id: id });
}

// --- Write Operations ---

export async function addMinistryArea(areaData: MinistryAreaWriteData): Promise<MinistryArea> {
  const newAreaId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  
  const newArea: MinistryArea = {
    ...areaData,
    id: newAreaId,
    memberIds: areaData.memberIds || [],
  };

  const insertedArea = await insertOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, newArea);

  // Atomically assign this area to the new leader and members
  if (areaData.leaderId) {
    await updateOneDocument(MEMBERS_COLLECTION, { id: areaData.leaderId }, { $addToSet: { assignedAreaIds: newAreaId } });
  }
  const memberIdsToAssign = (areaData.memberIds || []).filter(id => id !== areaData.leaderId);
  if (memberIdsToAssign.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { id: { $in: memberIdsToAssign } }, { $addToSet: { assignedAreaIds: newAreaId } });
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
      await updateOneDocument(MEMBERS_COLLECTION, { id: originalArea.leaderId }, { $pull: { assignedAreaIds: areaId } });
    }
    // Promote new leader
    if (newLeaderId) {
      await updateOneDocument(MEMBERS_COLLECTION, { id: newLeaderId }, { $addToSet: { assignedAreaIds: areaId } });
    }
  }

  // 2. Handle Member List Changes
  const membersAdded = [...newMemberIds].filter(id => !originalMemberIds.has(id));
  const membersRemoved = [...originalMemberIds].filter(id => !newMemberIds.has(id));

  if (membersAdded.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { id: { $in: membersAdded } }, { $addToSet: { assignedAreaIds: areaId } });
  }
  if (membersRemoved.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { id: { $in: membersRemoved } }, { $pull: { assignedAreaIds: areaId } });
  }

  // --- Update Ministry Area Document ---
  const finalUpdateData: Partial<MinistryArea> = {};
  if (updates.name) finalUpdateData.name = updates.name;
  if (updates.description) finalUpdateData.description = updates.description;
  if (updates.leaderId !== undefined) finalUpdateData.leaderId = updates.leaderId;
  // Ensure the final member list doesn't include the leader
  if (updates.memberIds !== undefined) finalUpdateData.memberIds = updates.memberIds.filter(id => id !== newLeaderId);

  return updateOneDocument<MinistryArea>(MINISTRY_AREAS_COLLECTION, { id: areaId }, { $set: finalUpdateData });
}

export async function deleteMinistryArea(areaId: string): Promise<boolean> {
  const areaToDelete = await getMinistryAreaById(areaId);
  if (!areaToDelete) throw new Error(`Ministry Area with ID ${areaId} not found.`);

  // 1. Unassign all members and the leader from this area
  const allAssignedIds = [areaToDelete.leaderId, ...areaToDelete.memberIds].filter(Boolean);
  if (allAssignedIds.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { id: { $in: allAssignedIds } }, { $pull: { assignedAreaIds: areaId } });
  }

  // 2. Delete associated meeting series for this group
  await deleteMeetingSeriesForGroup(areaId);

  // 3. Delete the Ministry Area itself
  return deleteOneDocument(MINISTRY_AREAS_COLLECTION, { id: areaId });
}
