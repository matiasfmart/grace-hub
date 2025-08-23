'use server';
import type { GDI, GDIWriteData } from '@/lib/types';
import { findDocuments, findOneDocument, insertOneDocument, updateOneDocument, updateManyDocuments, deleteOneDocument } from '@/lib/db-utils';
import { deleteMeetingSeriesForGroup } from './groupMeetingService';
import { ObjectId } from 'mongodb';

const GDIS_COLLECTION = 'gdis';
const MEMBERS_COLLECTION = 'members';

// --- Read Operations ---

export async function getAllGdis(): Promise<GDI[]> {
  return findDocuments<GDI>(GDIS_COLLECTION, {}, { sort: { name: 1 } });
}

export async function getGdiById(id: string): Promise<GDI | null> {
  return findOneDocument<GDI>(GDIS_COLLECTION, { _id: new ObjectId(id) });
}

// --- Write Operations ---

export async function addGdi(gdiData: GDIWriteData): Promise<GDI> {
  
  const newGdi: Omit<GDI, 'id'> = {
    ...gdiData,
    memberIds: gdiData.memberIds || [],
  };

  // Insert the new GDI document
  const insertedGdi = await insertOneDocument<GDI>(GDIS_COLLECTION, newGdi);

  // Atomically update the new guide and members to assign them to this GDI
  if (gdiData.guideId) {
    await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(gdiData.guideId) }, { $set: { assignedGDIId: insertedGdi.id } });
  }
  if (gdiData.memberIds && gdiData.memberIds.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: gdiData.memberIds.map(id => new ObjectId(id)) } }, { $set: { assignedGDIId: insertedGdi.id } });
  }

  return insertedGdi;
}

export async function updateGdiAndSyncMembers(
  gdiId: string,
  updates: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<GDI | null> {
  const originalGdi = await getGdiById(gdiId);
  if (!originalGdi) throw new Error(`GDI with ID ${gdiId} not found.`);

  // --- Sync Members and Guide Assignments ---
  const newGuideId = updates.guideId;
  const newMemberIds = new Set(updates.memberIds || []);
  const originalMemberIds = new Set(originalGdi.memberIds || []);

  // 1. Handle Guide Change
  if (newGuideId !== undefined && newGuideId !== originalGdi.guideId) {
    // Demote old guide (if any)
    if (originalGdi.guideId) {
      await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(originalGdi.guideId) }, { $set: { assignedGDIId: null } });
    }
    // Promote new guide
    if (newGuideId) {
      await updateOneDocument(MEMBERS_COLLECTION, { _id: new ObjectId(newGuideId) }, { $set: { assignedGDIId: gdiId } });
    }
  }

  // 2. Handle Member List Changes
  const membersAdded = [...newMemberIds].filter(id => !originalMemberIds.has(id));
  const membersRemoved = [...originalMemberIds].filter(id => !newMemberIds.has(id));

  if (membersAdded.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: membersAdded.map(id => new ObjectId(id)) } }, { $set: { assignedGDIId: gdiId } });
  }
  if (membersRemoved.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: membersRemoved.map(id => new ObjectId(id)) } }, { $set: { assignedGDIId: null } });
  }

  // --- Update GDI Document ---
  const finalUpdateData: Partial<GDI> = {};
  if (updates.name) finalUpdateData.name = updates.name;
  if (updates.guideId !== undefined) finalUpdateData.guideId = updates.guideId;
  if (updates.memberIds !== undefined) finalUpdateData.memberIds = updates.memberIds;

  return updateOneDocument<GDI>(GDIS_COLLECTION, { _id: new ObjectId(gdiId) }, { $set: finalUpdateData });
}

export async function deleteGdi(gdiId: string): Promise<boolean> {
  const gdiToDelete = await getGdiById(gdiId);
  if (!gdiToDelete) throw new Error(`GDI with ID ${gdiId} not found.`);

  // 1. Unassign all members and the guide from this GDI
  const allAssignedIds = [gdiToDelete.guideId, ...gdiToDelete.memberIds].filter(Boolean);
  if (allAssignedIds.length > 0) {
    await updateManyDocuments(MEMBERS_COLLECTION, { _id: { $in: allAssignedIds.map(id => new ObjectId(id)) } }, { $set: { assignedGDIId: null } });
  }

  // 2. Delete associated meeting series for this group
  await deleteMeetingSeriesForGroup(gdiId);

  // 3. Delete the GDI itself
  return deleteOneDocument(GDIS_COLLECTION, { _id: new ObjectId(gdiId) });
}