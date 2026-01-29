/**
 * API Layer Index
 *
 * Main entry point for the API layer.
 *
 * Architecture Overview:
 * =====================
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │                    COMPONENTS                            │
 * │            (use frontend domain types)                   │
 * └─────────────────────┬───────────────────────────────────┘
 *                       │
 *                       ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │                    SERVICES                              │
 * │     (orchestrate endpoints + mappers, return            │
 * │      frontend domain types)                             │
 * └─────────────────────┬───────────────────────────────────┘
 *                       │
 *          ┌───────────┴───────────┐
 *          ▼                       ▼
 * ┌─────────────────┐   ┌─────────────────────────────────┐
 * │    ENDPOINTS    │   │           MAPPERS               │
 * │  (raw API       │   │  (translate API types ↔         │
 * │   calls)        │   │   frontend types)               │
 * └────────┬────────┘   └─────────────────────────────────┘
 *          │
 *          ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │                     CLIENT                               │
 * │           (HTTP client, error handling)                  │
 * └─────────────────────┬───────────────────────────────────┘
 *                       │
 *                       ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │                    BACKEND                               │
 * │               (grace-hub-service)                        │
 * └─────────────────────────────────────────────────────────┘
 *
 * Usage:
 * ------
 * Components should import from services:
 *
 *   import { membersService } from '@/lib/api';
 *
 *   const members = await membersService.getAll();
 *
 * The services return frontend domain types (from @/lib/types),
 * not API types. This keeps components decoupled from the backend.
 */

// ==============================================
// MAIN EXPORTS - Services for component use
// ==============================================
export {
  membersService,
  gdisService,
  areasService,
  meetingsService,
  attendanceService,
  tithesService,
  rolesService,
} from './services';

// ==============================================
// CLIENT AND ERROR TYPES
// ==============================================
export { apiClient, ApiError } from './client';

// ==============================================
// API TYPES (for advanced use cases)
// ==============================================
export type * from './types';

// ==============================================
// MAPPERS (for custom mapping needs)
// ==============================================
export * from './mappers';

