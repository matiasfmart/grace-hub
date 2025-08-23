'use server';
import clientPromise from './mongodb-client';
import { Collection, Db, Document, Filter, FindOptions, ObjectId, UpdateFilter, WithId } from 'mongodb';

// --- DB ACCESS HELPERS ---

async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('grace-hub');
}

export async function getCollection(collectionName: string): Promise<Collection> {
  const db = await getDb();
  return db.collection(collectionName);
}

// --- DATA MAPPING ---

function mapDocumentId(doc: any): any {
    if (!doc || !doc._id) return doc;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() };
}

// --- GENERIC CRUD OPERATIONS ---

export async function findDocuments(collectionName: string, filter: Filter<any> = {}, options: FindOptions = {}): Promise<any[]> {
  try {
    const collection = await getCollection(collectionName);
    const documents = await collection.find(filter, options).toArray();
    return documents.map(mapDocumentId);
  } catch (error) {
    console.error(`Error finding documents in ${collectionName}:`, error);
    return [];
  }
}

export async function findOneDocument(collectionName: string, filter: Filter<any>): Promise<any | null> {
  try {
    const collection = await getCollection(collectionName);
    const document = await collection.findOne(filter);
    if (!document) return null;
    return mapDocumentId(document);
  } catch (error) {
    console.error(`Error finding one document in ${collectionName}:`, error);
    return null;
  }
}

export async function insertOneDocument(collectionName: string, doc: any): Promise<any> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.insertOne(doc);
    return { ...doc, id: result.insertedId.toHexString() };
  } catch (error) {
    console.error(`Error inserting document into ${collectionName}:`, error);
    throw error;
  }
}

export async function insertManyDocuments(collectionName: string, docs: any[]): Promise<number> {
    try {
        const collection = await getCollection(collectionName);
        const result = await collection.insertMany(docs);
        return result.insertedCount;
    } catch (error) {
        console.error(`Error inserting many documents into ${collectionName}:`, error);
        return 0;
    }
}

export async function updateOneDocument(collectionName: string, filter: Filter<any>, update: UpdateFilter<any>): Promise<any | null> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    if (!result) return null;
    return mapDocumentId(result);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return null;
  }
}

export async function updateManyDocuments(collectionName: string, filter: Filter<any>, update: UpdateFilter<any>): Promise<number> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.updateMany(filter, update);
    return result.modifiedCount;
  } catch (error) {
    console.error(`Error updating many documents in ${collectionName}:`, error);
    return 0;
  }
}

export async function deleteOneDocument(collectionName: string, filter: Filter<any>): Promise<boolean> {
  try {
    const collection = await getCollection(collectionName);
    const result = await collection.deleteOne(filter);
    return result.deletedCount === 1;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return false;
  }
}

export async function deleteManyDocuments(collectionName: string, filter: Filter<any>): Promise<number> {
    try {
        const collection = await getCollection(collectionName);
        const result = await collection.deleteMany(filter);
        return result.deletedCount;
    } catch (error) {
        console.error(`Error deleting many documents from ${collectionName}:`, error);
        return 0;
    }
}

export async function countDocuments(collectionName: string, filter: Filter<any> = {}): Promise<number> {
  try {
    const collection = await getCollection(collectionName);
    return await collection.countDocuments(filter);
  } catch (error) {
    console.error(`Error counting documents in ${collectionName}:`, error);
    return 0;
  }
}