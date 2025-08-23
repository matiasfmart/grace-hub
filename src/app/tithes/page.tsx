'use server';

import type { Member, GDI, MinistryArea, MemberRoleType } from '@/lib/types';
import { getAllMembers, getAllMembersNonPaginated } from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getAllTitheRecords } from '@/services/titheService';
import { MemberRoleEnum, NO_GDI_FILTER_VALUE, NO_ROLE_FILTER_VALUE, NO_AREA_FILTER_VALUE } from '@/lib/types';
import { TithesTracker } from '@/components/tithes/TithesTracker';

const roleDisplayMap: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};
const roleFilterOptions: { value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE; label: string }[] = [
    ...(Object.keys(MemberRoleEnum.Values) as MemberRoleType[]).map(role => ({
        value: role,
        label: roleDisplayMap[role] || role,
    })),
    { value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" }
];

const statusDisplayMap: Record<Member['status'], string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  New: "Nuevo"
};
const statusFilterOptions: { value: Member['status']; label: string }[] = Object.entries(statusDisplayMap)
    .map(([value, label]) => ({ value: value as Member['status'], label }));

async function getTithesPageData(searchParams: TithesPageProps['searchParams']) {
  const currentPage = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 25;
  const searchTerm = searchParams.search || '';
  const memberStatusFilterString = searchParams.status || '';

  const currentMemberStatusFiltersArray = memberStatusFilterString ? memberStatusFilterString.split(',') : [];
  
  const [
    { members, totalMembers, totalPages },
    allMembersForDropdowns,
    allGDIs,
    allMinistryAreas,
    allTitheRecords,
  ] = await Promise.all([
    getAllMembers(
      currentPage,
      pageSize,
      searchTerm,
      currentMemberStatusFiltersArray
    ),
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllTitheRecords(),
  ]);
  
  const absoluteTotalMembers = allMembersForDropdowns.length;

  const gdiFilterOptions = [
    { value: NO_GDI_FILTER_VALUE, label: "Miembros Sin GDI Asignado" },
    ...allGDIs.map(gdi => ({
        value: gdi.id,
        label: `${gdi.name} (Guía: ${allMembersForDropdowns.find(m => m.id === gdi.guideId)?.firstName || ''} ${allMembersForDropdowns.find(m => m.id === gdi.guideId)?.lastName || 'N/A'})`
    }))
  ];

  const areaFilterOptions = [
    { value: NO_AREA_FILTER_VALUE, label: "Miembros Sin Área Asignada" },
    ...allMinistryAreas.map(area => ({
        value: area.id,
        label: `${area.name} (Líder: ${allMembersForDropdowns.find(m => m.id === area.leaderId)?.firstName || ''} ${allMembersForDropdowns.find(m => m.id === area.leaderId)?.lastName || 'N/A'})`
    }))
  ];

  return {
    members,
    totalMembers,
    totalPages,
    currentPage,
    pageSize,
    allTitheRecords,
    filters: {
      roleFilterOptions,
      statusFilterOptions,
      gdiFilterOptions,
      areaFilterOptions,
      currentSearchTerm: searchTerm,
      currentRoleFilters: [],
      currentStatusFilters: currentMemberStatusFiltersArray,
      currentGdiFilters: [],
      currentAreaFilters: [],
    },
    absoluteTotalMembers
  };
}

interface TithesPageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    role?: string;
    guide?: string;
    area?: string;
    startDate?: string;
    endDate?: string;
  };
}

export default async function TithesPage({ searchParams }: TithesPageProps) {
  const { members, totalMembers, totalPages, currentPage, pageSize, allTitheRecords, filters, absoluteTotalMembers } = await getTithesPageData(searchParams);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Seguimiento de Diezmos</h1>
        <p className="text-muted-foreground mt-2">
          Registre y visualice el estado de los diezmos de los miembros mensualmente.
        </p>
      </div>
      <TithesTracker
        initialMembers={members}
        initialTitheRecords={allTitheRecords}
        totalMembers={totalMembers}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        absoluteTotalMembers={absoluteTotalMembers}
        filters={filters}
        initialStartDate={searchParams.startDate}
        initialEndDate={searchParams.endDate}
      />
    </div>
  );
}