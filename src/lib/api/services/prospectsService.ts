import { prospectsEndpoint } from '../endpoints/prospectsEndpoint';
import { mapApiProspectToProspect, mapApiProspectsToProspects } from '../mappers/prospectMapper';
import type { Prospect } from '@/lib/types';
import type { ApiCreateProspectRequest, ApiUpdateProspectRequest } from '../types';

export const prospectsService = {
  async getPending(): Promise<Prospect[]> {
    const api = await prospectsEndpoint.getFiltered('pending');
    return mapApiProspectsToProspects(api);
  },

  async getIntegrated(): Promise<Prospect[]> {
    const api = await prospectsEndpoint.getFiltered('integrated');
    return mapApiProspectsToProspects(api);
  },

  async getLost(): Promise<Prospect[]> {
    const api = await prospectsEndpoint.getFiltered('lost');
    return mapApiProspectsToProspects(api);
  },

  async getById(id: string): Promise<Prospect> {
    const api = await prospectsEndpoint.getById(Number(id));
    return mapApiProspectToProspect(api);
  },

  async countPending(): Promise<number> {
    const res = await prospectsEndpoint.countPending();
    return res.count;
  },

  async integrate(id: string, gdiId?: string): Promise<Prospect> {
    const api = await prospectsEndpoint.integrate(Number(id), {
      gdiId: gdiId ? Number(gdiId) : undefined,
    });
    return mapApiProspectToProspect(api);
  },

  async archive(id: string): Promise<Prospect> {
    const api = await prospectsEndpoint.archive(Number(id));
    return mapApiProspectToProspect(api);
  },

  async create(data: ApiCreateProspectRequest): Promise<Prospect> {
    const api = await prospectsEndpoint.create(data);
    return mapApiProspectToProspect(api);
  },

  async updateFields(id: string, data: ApiUpdateProspectRequest): Promise<Prospect> {
    const api = await prospectsEndpoint.updateFields(Number(id), data);
    return mapApiProspectToProspect(api);
  },
};
