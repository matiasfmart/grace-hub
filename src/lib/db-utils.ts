'use server';
import clientPromise from './mongodb-client';
import { Collection, Db, Filter, FindOptions, ObjectId, UpdateFilter } from 'mongodb';

// --- DB ACCESS HELPERS ---

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('grace-hub');
}

export async function getCollection(collectionName: string): Promise<Collection> {
  const db = await getDb();
  return db.collection(collectionName);
}

// --- GENERIC CRUD OPERATIONS ---

/**
 * Finds multiple documents in a collection that match a filter.
 * @param collectionName The name of the collection.
 * @param filter The MongoDB filter query.
 * @param options Find options (sort, limit, skip, projection).
 * @returns An array of documents.
 */
export async function findDocuments<T>(collectionName: string, filter: Filter<T> = {}, options: FindOptions = {}): Promise<T[]> {
  try {
    const collection = await getCollection(collectionName);
    const documents = await collection.find(filter, options).toArray();
    return documents.map(doc => ({ ...doc, _id: doc._id.toString() })) as T[];
  } catch (error) {
    console.error(`Error finding documents in ${collectionName}:`, error);
    return [];
  }
}

/**
 * Finds a single document in a collection.
 * @param collectionName The name of the collection.
 * @param filter The MongoDB filter query.
 * @returns A single document or null if not found.
 */
export async function findOneDocument<T>(collectionName: string, filter: Filter<T>): Promise<T | null> {
  try {
    const collection = await getCollection(collectionName);
    const document = await collection.findOne(filter);
    if (!document) return null;
    return { ...document, _id: document._id.toString() } as T;
  } catch (error) {
    console.error(`Error finding one document in ${collectionName}:`, error);
    return null;
  }
}

/**
 * Inserts a single document into a collection.
 * @param collectionName The name of the collection.
 * @param doc The document to insert.
 * @returns The inserted document, including its new _id.
 */
export async function insertOneDocument<T>(collectionName: string, doc: any): Promise<T> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as T;
  } catch (error) {
    console.error(`Error inserting document into ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Inserts multiple documents into a collection.
 * @param collectionName The name of the collection.
 * @param docs The documents to insert.
 * @returns The number of documents inserted.
 */
export async function insertManyDocuments<T>(collectionName: string, docs: any[]): Promise<number> {
    try {
        const collection = await getCollection(collectionName);
        const result = await collection.insertMany(docs);
        return result.insertedCount;
    } catch (error) {
        console.error(`Error inserting many documents into ${collectionName}:`, error);
        return 0;
    }
}

/**
 * Updates a single document in a collection.
 * @param collectionName The name of the collection.
 * @param filter The filter to select the document to update.
 * @param update The update operations (e.g., { $set: { ... } }).
 * @returns The updated document or null if not found.
 */
export async function updateOneDocument<T>(collectionName: string, filter: Filter<T>, update: UpdateFilter<T>): Promise<T | null> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    if (!result) return null;
    return { ...result, _id: result._id.toString() } as T;
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return null;
  }
}


/**
 * Updates multiple documents in a collection.
 * @param collectionName The name of the collection.
 * @param filter The filter to select the documents to update.
 * @param update The update operations (e.g., { $set: { ... } }).
 * @returns The number of documents modified.
 */
export async function updateManyDocuments<T>(collectionName: string, filter: Filter<T>, update: UpdateFilter<T>): Promise<number> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.updateMany(filter, update);
    return result.modifiedCount;
  } catch (error) {
    console.error(`Error updating many documents in ${collectionName}:`, error);
    return 0;
  }
}

/**
 * Deletes a single document from a collection.
 * @param collectionName The name of the collection.
 * @param filter The filter to select the document to delete.
 * @returns True if a document was deleted, false otherwise.
 */
export async function deleteOneDocument<T>(collectionName: string, filter: Filter<T>): Promise<boolean> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.deleteOne(filter);
    return result.deletedCount === 1;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return false;
  }
}

/**
 * Deletes multiple documents from a collection.
 * @param collectionName The name of the collection.
 * @param filter The filter to select the documents to delete.
 * @returns The number of documents deleted.
 */
export async function deleteManyDocuments<T>(collectionName: string, filter: Filter<T>): Promise<number> {
    try {
        const collection = await getCollection(collectionName);
        const result = await collection.deleteMany(filter);
        return result.deletedCount;
    } catch (error) {
        console.error(`Error deleting many documents from ${collectionName}:`, error);
        return 0;
    }
}

/**
 * Counts the number of documents in a collection matching a filter.
 * @param collectionName The name of the collection.
 * @param filter The MongoDB filter query.
 * @returns The total count of matching documents.
 */
export async function countDocuments<T>(collectionName: string, filter: Filter<T> = {}): Promise<number> {
  try {
    const collection = await getCollection(collectionName);
    return await collection.countDocuments(filter);
  } catch (error) {
    console.error(`Error counting documents in ${collectionName}:`, error);
    return 0;
  }
}