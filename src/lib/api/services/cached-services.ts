/**
 * Cached Services
 *
 * Module-level TTL cache for expensive cross-tab data.
 * Works correctly alongside `force-dynamic` and httpOnly cookie auth.
 *
 * Why NOT unstable_cache: `unstable_cache` runs its callback outside the request
 * context, so `cookies()` throws inside it → auth header is null → 401.
 *
 * This implementation caches at the Node.js process level (survives across
 * requests) and supports tag-based invalidation called from Server Actions.
 *
 * TTL: 5 minutes. Mutations call invalidateCacheByTag() immediately.
 */

import {
  getAllMeetings,
  getAllMeetingSeries,
  getAllMembersNonPaginated,
  getAllGdis,
  getAllMinistryAreas,
  getAllAttendanceRecords,
  getStatsByMeetings,
  getMeetingsCountBySeries,
  getMemberCount,
  getMemberRoleSummary,
} from './index';
import type { AttendanceMeetingStats } from '@/lib/types';

const TTL_MS = 300_000; // 5 minutes

// ============================================================
// Internal cache store
// ============================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const tagIndex = new Map<string, Set<string>>(); // tag → Set<cacheKey>

async function withCache<T>(
  key: string,
  tags: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiry > now) return entry.data;

  const data = await fn();
  store.set(key, { data, expiry: now + TTL_MS });

  for (const tag of tags) {
    if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
    tagIndex.get(tag)!.add(key);
  }

  return data;
}

/**
 * Invalidate all cache entries that belong to the given tag.
 * Call this from Server Actions after mutations.
 */
export function invalidateCacheByTag(tag: string): void {
  const keys = tagIndex.get(tag);
  if (!keys) return;
  for (const key of keys) store.delete(key);
  tagIndex.delete(tag);
}

// ============================================================
// MEETINGS
// ============================================================

export const getCachedAllMeetings = () =>
  withCache('all-meetings', ['meetings'], getAllMeetings);

export const getCachedAllMeetingSeries = () =>
  withCache('all-meeting-series', ['meeting-series'], getAllMeetingSeries);

export const getCachedMeetingsCountBySeries = () =>
  withCache('meetings-count-by-series', ['meeting-series', 'meetings'], getMeetingsCountBySeries);

// ============================================================
// MEMBERS
// ============================================================

export const getCachedAllMembersNonPaginated = () =>
  withCache('all-members', ['members'], getAllMembersNonPaginated);

export const getCachedMemberCount = () =>
  withCache('member-count', ['members'], getMemberCount);

export const getCachedMemberRoleSummary = () =>
  withCache('member-role-summary', ['members'], getMemberRoleSummary);

// ============================================================
// GROUPS (GDIs / Ministry Areas)
// ============================================================

export const getCachedAllGdis = () =>
  withCache('all-gdis', ['gdis'], getAllGdis);

export const getCachedAllMinistryAreas = () =>
  withCache('all-ministry-areas', ['ministry-areas'], getAllMinistryAreas);

// ============================================================
// ATTENDANCE
// ============================================================

export const getCachedAllAttendanceRecords = () =>
  withCache('all-attendance-records', ['attendance'], getAllAttendanceRecords);

/**
 * Cached attendance stats for a specific list of meeting IDs.
 * Cache key includes sorted IDs so different combinations are cached separately.
 */
export function getCachedAttendanceStatsByMeetings(meetingIds: string[]): Promise<AttendanceMeetingStats[]> {
  const sorted = [...meetingIds].sort();
  const key = `attendance-stats-${sorted.join(',')}`;
  return withCache(key, ['attendance'], () => getStatsByMeetings(sorted));
}

