"use server";
import {
	deleteOneDocument,
	findDocuments,
	findOneDocument,
	insertOneDocument,
	updateManyDocuments,
	updateOneDocument,
	withTransaction,
} from "@/lib/db-utils";
import { toObjectId, toObjectIds } from "@/lib/id-utils";
import type { MinistryArea, MinistryAreaDocument } from "@/lib/types";
import { deleteMeetingSeriesForGroup } from "./groupMeetingService";

const MINISTRY_AREAS_COLLECTION = "ministry-areas";
const MEMBERS_COLLECTION = "members";

// ============================================
// READ OPERATIONS
// ============================================

export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
	return findDocuments<MinistryAreaDocument>(
		MINISTRY_AREAS_COLLECTION,
		{},
		{ sort: { name: 1 } },
	) as Promise<MinistryArea[]>;
}

export async function getMinistryAreaById(
	id: string,
): Promise<MinistryArea | null> {
	const oid = toObjectId(id);
	if (!oid) return null;
	return findOneDocument<MinistryAreaDocument>(MINISTRY_AREAS_COLLECTION, {
		_id: oid,
	}) as Promise<MinistryArea | null>;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function addMinistryArea(
	areaData: Omit<MinistryArea, "id">,
): Promise<MinistryArea> {
	const leaderOid = toObjectId(areaData.leaderId);
	const memberOids = toObjectIds(areaData.memberIds || []);

	if (!leaderOid) {
		throw new Error("Invalid leader ID");
	}

	// Convert to Document format with ObjectIds
	const newAreaDoc: Omit<MinistryAreaDocument, "_id"> = {
		...areaData,
		leaderId: leaderOid,
		memberIds: memberOids,
	};

	// Insert the new Ministry Area document
	const insertedArea = (await insertOneDocument<MinistryAreaDocument>(
		MINISTRY_AREAS_COLLECTION,
		newAreaDoc,
	)) as MinistryArea;

	// Atomically update the leader and members to assign them to this area
	const insertedAreaOid = toObjectId(insertedArea.id);
	if (!insertedAreaOid) throw new Error("Failed to get inserted area ID");

	if (areaData.leaderId) {
		await updateOneDocument(
			MEMBERS_COLLECTION,
			{ _id: leaderOid },
			{ $addToSet: { assignedAreaIds: insertedAreaOid } as any },
		);
	}

	if (memberOids.length > 0) {
		await updateManyDocuments(
			MEMBERS_COLLECTION,
			{ _id: { $in: memberOids } },
			{ $addToSet: { assignedAreaIds: insertedAreaOid } as any },
		);
	}

	return insertedArea;
}

/**
 * Update Ministry Area and sync member assignments with transaction
 */
export async function updateMinistryAreaAndSyncMembers(
	areaId: string,
	updates: Partial<
		Pick<MinistryArea, "name" | "description" | "leaderId" | "memberIds">
	>,
): Promise<MinistryArea | null> {
	const areaOid = toObjectId(areaId);
	if (!areaOid) throw new Error("Invalid Ministry Area ID");

	const originalArea = await getMinistryAreaById(areaId);
	if (!originalArea)
		throw new Error(`Ministry Area with ID ${areaId} not found.`);

	return withTransaction(async (session) => {
		const newLeaderId = updates.leaderId;
		const newMemberIds = new Set(updates.memberIds || []);
		const originalMemberIds = new Set(originalArea.memberIds || []);

		// 1. Handle Leader Change
		if (newLeaderId !== undefined && newLeaderId !== originalArea.leaderId) {
			// Demote old leader
			if (originalArea.leaderId) {
				const oldLeaderOid = toObjectId(originalArea.leaderId);
				if (oldLeaderOid) {
					await updateOneDocument(
						MEMBERS_COLLECTION,
						{ _id: oldLeaderOid },
						{ $pull: { assignedAreaIds: areaOid } as any },
						{ session },
					);
				}
			}
			// Promote new leader
			if (newLeaderId) {
				const newLeaderOid = toObjectId(newLeaderId);
				if (newLeaderOid) {
					await updateOneDocument(
						MEMBERS_COLLECTION,
						{ _id: newLeaderOid },
						{ $addToSet: { assignedAreaIds: areaOid } as any },
						{ session },
					);
				}
			}
		}

		// 2. Handle Member List Changes
		const membersAdded = [...newMemberIds].filter(
			(id) => !originalMemberIds.has(id),
		);
		const membersRemoved = [...originalMemberIds].filter(
			(id) => !newMemberIds.has(id),
		);

		if (membersAdded.length > 0) {
			const addedOids = toObjectIds(membersAdded);
			if (addedOids.length > 0) {
				await updateManyDocuments(
					MEMBERS_COLLECTION,
					{ _id: { $in: addedOids } },
					{ $addToSet: { assignedAreaIds: areaOid } as any },
					{ session },
				);
			}
		}
		if (membersRemoved.length > 0) {
			const removedOids = toObjectIds(membersRemoved);
			if (removedOids.length > 0) {
				await updateManyDocuments(
					MEMBERS_COLLECTION,
					{ _id: { $in: removedOids } },
					{ $pull: { assignedAreaIds: areaOid } as any },
					{ session },
				);
			}
		}

		// 3. Update Ministry Area Document
		const finalUpdateData: any = {};
		if (updates.name) finalUpdateData.name = updates.name;
		if (updates.description) finalUpdateData.description = updates.description;
		if (updates.leaderId !== undefined)
			finalUpdateData.leaderId = toObjectId(updates.leaderId);
		if (updates.memberIds !== undefined)
			finalUpdateData.memberIds = toObjectIds(updates.memberIds);

		return updateOneDocument<MinistryAreaDocument>(
			MINISTRY_AREAS_COLLECTION,
			{ _id: areaOid },
			{ $set: finalUpdateData },
			{ session },
		) as Promise<MinistryArea | null>;
	});
}

/**
 * Delete Ministry Area with transaction to ensure data consistency
 */
export async function deleteMinistryArea(areaId: string): Promise<boolean> {
	const areaOid = toObjectId(areaId);
	if (!areaOid) throw new Error("Invalid Ministry Area ID");

	const areaToDelete = await getMinistryAreaById(areaId);
	if (!areaToDelete)
		throw new Error(`Ministry Area with ID ${areaId} not found.`);

	return withTransaction(async (session) => {
		// 1. Unassign all members and the leader from this area
		const allAssignedIds = [
			areaToDelete.leaderId,
			...areaToDelete.memberIds,
		].filter(Boolean);
		if (allAssignedIds.length > 0) {
			const allAssignedOids = toObjectIds(allAssignedIds);
			if (allAssignedOids.length > 0) {
				await updateManyDocuments(
					MEMBERS_COLLECTION,
					{ _id: { $in: allAssignedOids } },
					{ $pull: { assignedAreaIds: areaOid } as any },
					{ session },
				);
			}
		}

		// 2. Delete associated meeting series for this group
		await deleteMeetingSeriesForGroup(areaId);

		// 3. Delete the Ministry Area itself
		return deleteOneDocument(
			MINISTRY_AREAS_COLLECTION,
			{ _id: areaOid },
			{ session },
		);
	});
}
