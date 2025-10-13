'use server';
import type { GDI, GDIDocument, MemberDocument } from '@/lib/types';
import {
  findDocuments,
  findOneDocument,
  insertOneDocument,
  updateOneDocument,
  updateManyDocuments,
  deleteOneDocument,
  withTransaction
} from '@/lib/db-utils';
import { toObjectId, toObjectIds } from '@/lib/id-utils';
import { deleteMeetingSeriesForGroup } from './groupMeetingService';
import { ObjectId } from 'mongodb';

const GDIS_COLLECTION = 'gdis';
const MEMBERS_COLLECTION = 'members';

// ============================================
// READ OPERATIONS
// ============================================

export async function getAllGdis(): Promise<GDI[]> {
  return findDocuments<GDIDocument>(GDIS_COLLECTION, {}, { sort: { name: 1 } });
}

export async function getGdiById(id: string): Promise<GDI | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  return findOneDocument<GDIDocument>(GDIS_COLLECTION, { _id: oid });
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function addGdi(gdiData: Omit<GDI, 'id'>): Promise<GDI> {
  const guideOid = toObjectId(gdiData.guideId);
  const memberOids = toObjectIds(gdiData.memberIds || []);

  if (!guideOid) {
    throw new Error('Invalid guide ID');
  }

  // Convert to Document format with ObjectIds
  const newGdiDoc: Omit<GDIDocument, '_id'> = {
    ...gdiData,
    guideId: guideOid,
    memberIds: memberOids,
  };

  // Insert the new GDI document
  const insertedGdi = await insertOneDocument<GDIDocument>(GDIS_COLLECTION, newGdiDoc);

  // Atomically update the guide and members to assign them to this GDI
  if (gdiData.guideId) {
    await updateOneDocument(
      MEMBERS_COLLECTION,
      { _id: guideOid },
      { $set: { assignedGDIId: toObjectId(insertedGdi.id) } }
    );
  }
  if (memberOids.length > 0) {
    await updateManyDocuments(
      MEMBERS_COLLECTION,
      { _id: { $in: memberOids } },
      { $set: { assignedGDIId: toObjectId(insertedGdi.id) } }
    );
  }

  return insertedGdi;
}

/**
 * Update GDI and sync member assignments with transaction
 */
export async function updateGdiAndSyncMembers(
  gdiId: string,
  updates: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<GDI | null> {
  const gdiOid = toObjectId(gdiId);
  if (!gdiOid) throw new Error('Invalid GDI ID');

  const originalGdi = await getGdiById(gdiId);
  if (!originalGdi) throw new Error(`GDI with ID ${gdiId} not found.`);

  return withTransaction(async (session) => {
    const newGuideId = updates.guideId;
    const newMemberIds = new Set(updates.memberIds || []);
    const originalMemberIds = new Set(originalGdi.memberIds || []);

    // 1. Handle Guide Change
    if (newGuideId !== undefined && newGuideId !== originalGdi.guideId) {
      // Demote old guide
      if (originalGdi.guideId) {
        const oldGuideOid = toObjectId(originalGdi.guideId);
        if (oldGuideOid) {
          await updateOneDocument(
            MEMBERS_COLLECTION,
            { _id: oldGuideOid },
            { $set: { assignedGDIId: null } },
            { session }
          );
        }
      }
      // Promote new guide
      if (newGuideId) {
        const newGuideOid = toObjectId(newGuideId);
        if (newGuideOid) {
          await updateOneDocument(
            MEMBERS_COLLECTION,
            { _id: newGuideOid },
            { $set: { assignedGDIId: gdiOid } },
            { session }
          );
        }
      }
    }

    // 2. Handle Member List Changes
    const membersAdded = [...newMemberIds].filter(id => !originalMemberIds.has(id));
    const membersRemoved = [...originalMemberIds].filter(id => !newMemberIds.has(id));

    if (membersAdded.length > 0) {
      const addedOids = toObjectIds(membersAdded);
      if (addedOids.length > 0) {
        await updateManyDocuments(
          MEMBERS_COLLECTION,
          { _id: { $in: addedOids } },
          { $set: { assignedGDIId: gdiOid } },
          { session }
        );
      }
    }
    if (membersRemoved.length > 0) {
      const removedOids = toObjectIds(membersRemoved);
      if (removedOids.length > 0) {
        await updateManyDocuments(
          MEMBERS_COLLECTION,
          { _id: { $in: removedOids } },
          { $set: { assignedGDIId: null } },
          { session }
        );
      }
    }

    // 3. Update GDI Document
    const finalUpdateData: any = {};
    if (updates.name) finalUpdateData.name = updates.name;
    if (updates.guideId !== undefined) finalUpdateData.guideId = toObjectId(updates.guideId);
    if (updates.memberIds !== undefined) finalUpdateData.memberIds = toObjectIds(updates.memberIds);

    return updateOneDocument<GDIDocument>(
      GDIS_COLLECTION,
      { _id: gdiOid },
      { $set: finalUpdateData },
      { session }
    );
  });
}

/**
 * Delete GDI with transaction to ensure data consistency
 */
export async function deleteGdi(gdiId: string): Promise<boolean> {
  const gdiOid = toObjectId(gdiId);
  if (!gdiOid) throw new Error('Invalid GDI ID');

  const gdiToDelete = await getGdiById(gdiId);
  if (!gdiToDelete) throw new Error(`GDI with ID ${gdiId} not found.`);

  return withTransaction(async (session) => {
    // 1. Unassign all members and the guide from this GDI
    const allAssignedIds = [gdiToDelete.guideId, ...gdiToDelete.memberIds].filter(Boolean);
    if (allAssignedIds.length > 0) {
      const allAssignedOids = toObjectIds(allAssignedIds);
      if (allAssignedOids.length > 0) {
        await updateManyDocuments(
          MEMBERS_COLLECTION,
          { _id: { $in: allAssignedOids } },
          { $set: { assignedGDIId: null } },
          { session }
        );
      }
    }

    // 2. Delete associated meeting series for this group
    await deleteMeetingSeriesForGroup(gdiId);

    // 3. Delete the GDI itself
    return deleteOneDocument(GDIS_COLLECTION, { _id: gdiOid }, { session });
  });
}
