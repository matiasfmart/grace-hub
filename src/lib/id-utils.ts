import { ObjectId } from 'mongodb';

// ============================================
// ID CONVERSION HELPERS
// ============================================

/**
 * Convert string ID to ObjectId (safe)
 * Returns null if invalid ID
 */
export function toObjectId(id: string | null | undefined): ObjectId | null {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch (error) {
    console.warn(`Invalid ObjectId: ${id}`);
    return null;
  }
}

/**
 * Convert array of string IDs to ObjectIds (filters out invalid)
 */
export function toObjectIds(ids: string[] | null | undefined): ObjectId[] {
  if (!ids || ids.length === 0) return [];
  return ids
    .map(id => toObjectId(id))
    .filter((oid): oid is ObjectId => oid !== null);
}

/**
 * Convert ObjectId to string (safe)
 */
export function toStringId(id: ObjectId | null | undefined): string | null {
  return id ? id.toHexString() : null;
}

/**
 * Convert array of ObjectIds to strings
 */
export function toStringIds(ids: ObjectId[] | null | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map(id => id.toHexString());
}
