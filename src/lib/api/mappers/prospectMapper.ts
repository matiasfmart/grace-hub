import type { ApiProspectResponse } from '../types';
import type { Prospect } from '@/lib/types';

export function mapApiProspectToProspect(api: ApiProspectResponse): Prospect {
  return {
    id: String(api.prospectId),
    firstName: api.firstName,
    lastName: api.lastName,
    fullName: api.fullName,
    contact: api.contact,
    source: api.source,
    addedBy: api.addedBy,
    addedByName: api.addedByName,
    visitDate: api.visitDate,
    notes: api.notes,
    status: api.status,
    memberId: api.memberId !== undefined ? String(api.memberId) : undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function mapApiProspectsToProspects(api: ApiProspectResponse[]): Prospect[] {
  return api.map(mapApiProspectToProspect);
}
