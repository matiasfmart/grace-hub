"use server";
import {
	type ClientSession,
	type Collection,
	type Db,
	type DeleteResult,
	type Document,
	type Filter,
	type FindOptions,
	type InsertOneResult,
	ObjectId,
	type UpdateFilter,
	type UpdateResult,
	type WithId,
} from "mongodb";
import clientPromise from "./mongodb-client";

const DB_NAME = process.env.MONGODB_DB_NAME;

if (!DB_NAME) {
	throw new Error(
		"Please define the MONGODB_DB_NAME environment variable inside .env.local",
	);
}

// ============================================
// DB ACCESS HELPERS
// ============================================

async function getDb(): Promise<Db> {
	const client = await clientPromise;
	return client.db(DB_NAME);
}

export async function getCollection<T extends Document>(
	collectionName: string,
): Promise<Collection<T>> {
	const db = await getDb();
	return db.collection<T>(collectionName);
}

/**
 * Get a MongoDB client session for transactions
 */
export async function getSession(): Promise<ClientSession> {
	const client = await clientPromise;
	return client.startSession();
}

// ============================================
// DATA MAPPING
// ============================================

/**
 * Type helper that converts ObjectId fields to strings
 * This helps TypeScript understand the transformation that happens in mapDocumentId
 */
type MappedDocument<T> = {
	[K in keyof T]: T[K] extends ObjectId
		? string
		: T[K] extends ObjectId | null | undefined
			? string | null | undefined
			: T[K] extends ObjectId[] | undefined
				? string[] | undefined
				: T[K] extends ObjectId[]
					? string[]
					: T[K];
};

/**
 * Map MongoDB document with _id to client object with id (string)
 * Also converts ObjectId references to strings recursively
 */
function mapDocumentId<T extends Document>(
	doc: WithId<T> | null,
): (MappedDocument<T> & { id: string }) | null {
	if (!doc) return null;

	const { _id, ...rest } = doc;
	const mapped: any = { ...rest, id: _id.toHexString() };

	// Convert common ObjectId fields to strings
	if (mapped.assignedGDIId instanceof ObjectId) {
		mapped.assignedGDIId = mapped.assignedGDIId.toHexString();
	} else if (mapped.assignedGDIId === null) {
		mapped.assignedGDIId = null;
	}

	if (Array.isArray(mapped.assignedAreaIds)) {
		mapped.assignedAreaIds = mapped.assignedAreaIds.map((id: any) =>
			id instanceof ObjectId ? id.toHexString() : id,
		);
	}

	if (mapped.guideId instanceof ObjectId) {
		mapped.guideId = mapped.guideId.toHexString();
	}

	if (Array.isArray(mapped.memberIds)) {
		mapped.memberIds = mapped.memberIds.map((id: any) =>
			id instanceof ObjectId ? id.toHexString() : id,
		);
	}

	if (mapped.leaderId instanceof ObjectId) {
		mapped.leaderId = mapped.leaderId.toHexString();
	}

	if (mapped.seriesId instanceof ObjectId) {
		mapped.seriesId = mapped.seriesId.toHexString();
	}

	if (mapped.ownerGroupId instanceof ObjectId) {
		mapped.ownerGroupId = mapped.ownerGroupId.toHexString();
	} else if (mapped.ownerGroupId === null) {
		mapped.ownerGroupId = null;
	}

	if (Array.isArray(mapped.attendeeUids)) {
		mapped.attendeeUids = mapped.attendeeUids.map((id: any) =>
			id instanceof ObjectId ? id.toHexString() : id,
		);
	}

	if (mapped.meetingId instanceof ObjectId) {
		mapped.meetingId = mapped.meetingId.toHexString();
	}

	if (mapped.memberId instanceof ObjectId) {
		mapped.memberId = mapped.memberId.toHexString();
	}

	return mapped as T & { id: string };
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

export async function findDocuments<T extends Document>(
	collectionName: string,
	filter: Filter<T> = {},
	options: FindOptions = {},
): Promise<(MappedDocument<T> & { id: string })[]> {
	try {
		const collection = await getCollection<T>(collectionName);
		const documents = await collection.find(filter, options).toArray();
		return documents.map((doc) => mapDocumentId(doc)!);
	} catch (error) {
		console.error(`Error finding documents in ${collectionName}:`, error);
		throw new Error(`Could not find documents in ${collectionName}.`);
	}
}

export async function findOneDocument<T extends Document>(
	collectionName: string,
	filter: Filter<T>,
	options?: { session?: ClientSession },
): Promise<(MappedDocument<T> & { id: string }) | null> {
	try {
		const collection = await getCollection<T>(collectionName);
		const document = await collection.findOne(filter, options);
		return mapDocumentId(document as WithId<T> | null);
	} catch (error) {
		console.error(`Error finding one document in ${collectionName}:`, error);
		throw new Error(`Could not find document in ${collectionName}.`);
	}
}

export async function insertOneDocument<T extends Document>(
	collectionName: string,
	doc: Omit<T, "_id">,
	options?: { session?: ClientSession },
): Promise<MappedDocument<T> & { id: string }> {
	try {
		const collection = await getCollection<T>(collectionName);
		const result: InsertOneResult<T> = await collection.insertOne(
			doc as any,
			options,
		);
		const newDoc = { _id: result.insertedId, ...doc };
		return mapDocumentId(newDoc as WithId<T>)!;
	} catch (error) {
		console.error(`Error inserting document into ${collectionName}:`, error);
		throw error;
	}
}

export async function insertManyDocuments(
	collectionName: string,
	docs: Document[],
	options?: { session?: ClientSession },
): Promise<number> {
	try {
		const collection = await getCollection(collectionName);
		const result = await collection.insertMany(docs, options);
		return result.insertedCount;
	} catch (error) {
		console.error(
			`Error inserting many documents into ${collectionName}:`,
			error,
		);
		throw new Error(`Could not insert many documents into ${collectionName}.`);
	}
}

export async function updateOneDocument<T extends Document>(
	collectionName: string,
	filter: Filter<T>,
	update: UpdateFilter<T>,
	options?: { session?: ClientSession },
): Promise<(MappedDocument<T> & { id: string }) | null> {
	try {
		const collection = await getCollection<T>(collectionName);
		const result = await collection.findOneAndUpdate(filter, update, {
			returnDocument: "after",
			...options,
		});
		return mapDocumentId(result as WithId<T> | null);
	} catch (error) {
		console.error(`Error updating document in ${collectionName}:`, error);
		throw new Error(`Could not update document in ${collectionName}.`);
	}
}

export async function updateManyDocuments(
	collectionName: string,
	filter: Filter<any>,
	update: UpdateFilter<any>,
	options?: { session?: ClientSession },
): Promise<UpdateResult> {
	try {
		const collection = await getCollection(collectionName);
		return await collection.updateMany(filter, update, options);
	} catch (error) {
		console.error(`Error updating many documents in ${collectionName}:`, error);
		throw new Error(`Could not update many documents in ${collectionName}.`);
	}
}

export async function deleteOneDocument(
	collectionName: string,
	filter: Filter<any>,
	options?: { session?: ClientSession },
): Promise<boolean> {
	try {
		const collection = await getCollection(collectionName);
		const result = await collection.deleteOne(filter, options);
		return result.deletedCount === 1;
	} catch (error) {
		console.error(`Error deleting document from ${collectionName}:`, error);
		throw new Error(`Could not delete document from ${collectionName}.`);
	}
}

export async function deleteManyDocuments(
	collectionName: string,
	filter: Filter<any>,
	options?: { session?: ClientSession },
): Promise<DeleteResult> {
	try {
		const collection = await getCollection(collectionName);
		return await collection.deleteMany(filter, options);
	} catch (error) {
		console.error(
			`Error deleting many documents from ${collectionName}:`,
			error,
		);
		throw new Error(`Could not delete many documents from ${collectionName}.`);
	}
}

export async function countDocuments(
	collectionName: string,
	filter: Filter<any> = {},
	options?: { session?: ClientSession },
): Promise<number> {
	try {
		const collection = await getCollection(collectionName);
		return await collection.countDocuments(filter, options);
	} catch (error) {
		console.error(`Error counting documents in ${collectionName}:`, error);
		throw new Error(`Could not count documents in ${collectionName}.`);
	}
}

// ============================================
// TRANSACTION HELPERS
// ============================================

/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success or aborts on error
 *
 * @example
 * await withTransaction(async (session) => {
 *   await insertOneDocument('members', memberData, { session });
 *   await updateOneDocument('gdis', filter, update, { session });
 * });
 */
export async function withTransaction<T>(
	fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
	const session = await getSession();

	try {
		let result: T;
		await session.withTransaction(async () => {
			result = await fn(session);
		});
		return result!;
	} catch (error) {
		console.error("Transaction failed:", error);
		throw error;
	} finally {
		await session.endSession();
	}
}
