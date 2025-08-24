'use server';
import clientPromise from './mongodb-client';
import { Collection, Db, Document, Filter, FindOptions, ObjectId, UpdateFilter, WithId, InsertOneResult, DeleteResult, UpdateResult } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME;

if (!DB_NAME) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
}

// --- DB ACCESS HELPERS ---

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(collectionName);
}

// --- DATA MAPPING ---

function mapDocumentId<T extends Document>(doc: WithId<T> | null): (T & { id: string }) | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() } as (T & { id: string });
}

// --- GENERIC CRUD OPERATIONS ---

export async function findDocuments<T extends Document>(collectionName: string, filter: Filter<T> = {}, options: FindOptions = {}): Promise<(T & { id: string })[]> {
  try {
    const collection = await getCollection<T>(collectionName);
    const documents = await collection.find(filter, options).toArray();
    return documents.map(doc => mapDocumentId(doc) as (T & { id: string }));
  } catch (error) {
    console.error(`Error finding documents in ${collectionName}:`, error);
    throw new Error(`Could not find documents in ${collectionName}.`);
  }
}

export async function findOneDocument<T extends Document>(collectionName: string, filter: Filter<T>): Promise<(T & { id: string }) | null> {
  try {
    const collection = await getCollection<T>(collectionName);
    const document = await collection.findOne(filter);
    return mapDocumentId(document);
  } catch (error) {
    console.error(`Error finding one document in ${collectionName}:`, error);
    throw new Error(`Could not find document in ${collectionName}.`);
  }
}

export async function insertOneDocument<T extends Document>(collectionName: string, doc: Omit<T, '_id'>): Promise<T & { id: string }> {
  try {
    const collection = await getCollection<T>(collectionName);
    const result: InsertOneResult<T> = await collection.insertOne(doc as any);
    const newDoc = { _id: result.insertedId, ...doc };
    return mapDocumentId(newDoc as WithId<T>) as (T & { id: string });
  } catch (error) {
    console.error(`Error inserting document into ${collectionName}:`, error);
    throw error;
  }
}

export async function insertManyDocuments(collectionName: string, docs: Document[]): Promise<number> {
    try {
        const collection = await getCollection(collectionName);
        const result = await collection.insertMany(docs);
        return result.insertedCount;
    } catch (error) {
        console.error(`Error inserting many documents into ${collectionName}:`, error);
        throw new Error(`Could not insert many documents into ${collectionName}.`);
    }
}

export async function updateOneDocument<T extends Document>(collectionName: string, filter: Filter<T>, update: UpdateFilter<T>): Promise<(T & { id: string }) | null> {
  try {
    const collection = await getCollection<T>(collectionName);
    const result = await collection.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    return mapDocumentId(result);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw new Error(`Could not update document in ${collectionName}.`);
  }
}

export async function updateManyDocuments(collectionName: string, filter: Filter<any>, update: UpdateFilter<any>): Promise<UpdateResult> {
  try {
    const collection = await getCollection(collectionName);
    return await collection.updateMany(filter, update);
  } catch (error) {
    console.error(`Error updating many documents in ${collectionName}:`, error);
    throw new Error(`Could not update many documents in ${collectionName}.`);
  }
}

export async function deleteOneDocument(collectionName: string, filter: Filter<any>): Promise<boolean> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.deleteOne(filter);
    return result.deletedCount === 1;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw new Error(`Could not delete document from ${collectionName}.`);
  }
}

export async function deleteManyDocuments(collectionName: string, filter: Filter<any>): Promise<DeleteResult> {
    try {
        const collection = await getCollection(collectionName);
        return await collection.deleteMany(filter);
    } catch (error) {
        console.error(`Error deleting many documents from ${collectionName}:`, error);
        throw new Error(`Could not delete many documents from ${collectionName}.`);
    }
}

export async function countDocuments(collectionName: string, filter: Filter<any> = {}): Promise<number> {
  try {
    const collection = await getCollection(collectionName);
    return await collection.countDocuments(filter);
  } catch (error) {
    console.error(`Error counting documents in ${collectionName}:`, error);
    throw new Error(`Could not count documents in ${collectionName}.`);
  }
}