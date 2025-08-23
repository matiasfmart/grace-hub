import type { Member, GDI, MinistryArea, Meeting, MeetingSeries, AttendanceRecord, MemberWriteData, TitheRecord } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
import { revalidatePath } from 'next/cache';
import {
    getAllMembers,
    getMemberById,
    addMember,
    updateMember,
    updateMemberAssignments,
    getAllMembersNonPaginated,
    bulkRecalculateAndUpdateRoles,
    deleteMember
} from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getAllMeetings, getAllMeetingSeries } from '@/services/meetingService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { getAllTitheRecords } from '@/services/titheService';
import { Suspense } from 'react';


export async function addSingleMemberAction(newMemberData: MemberWriteData): Promise<{ success: boolean; message: string; newMember?: Member }> {
  'use server';
  try {
    const newMember = await addMember(newMemberData);

    revalidatePath('/members');
    revalidatePath('/groups');
    if (newMember.assignedAreaIds) {
      newMember.assignedAreaIds.forEach(areaId => {
        revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
      });
    }
    if (newMember.assignedGDIId) {
        revalidatePath(`/groups/gdis/${newMember.assignedGDIId}/manage`);
    }

    return { success: true, message: `Miembro ${newMember.firstName} ${newMember.lastName} agregado exitosamente. Roles calculados.`, newMember };
  } catch (error: any) {
    
    return { success: false, message: `Error al guardar miembro: ${error.message}` };
  }
}

export async function updateMemberAction(updatedMemberData: Member): Promise<{ success: boolean; message: string; updatedMember?: Member }> {
  'use server';
  if (!updatedMemberData.id) {
    return { success: false, message: "Error: ID de miembro es requerido para actualizar." };
  }
  try {
    const originalMemberData = await getMemberById(updatedMemberData.id);
    if (!originalMemberData) {
      return { success: false, message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.` };
    }

    const memberToUpdate = await updateMember(updatedMemberData.id, updatedMemberData);
    if(!memberToUpdate) {
        return { success: false, message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.` };
    }

    await updateMemberAssignments(
      memberToUpdate.id,
      originalMemberData,
      memberToUpdate
    );

    const allAffectedIds = Array.from(new Set([memberToUpdate.id, originalMemberData.id]));
    if (allAffectedIds.length > 0) {
        await bulkRecalculateAndUpdateRoles(allAffectedIds);
    }

    revalidatePath('/members');
    revalidatePath('/groups');
    const allPotentiallyAffectedAreaIds = new Set([...(originalMemberData.assignedAreaIds || []), ...(memberToUpdate.assignedAreaIds || [])]);
    allPotentiallyAffectedAreaIds.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/admin`));
    if (originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${originalMemberData.assignedGDIId}/admin`);
    if (memberToUpdate.assignedGDIId && memberToUpdate.assignedGDIId !== originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${memberToUpdate.assignedGDIId}/admin`);

    const finalUpdatedMember = await getMemberById(memberToUpdate.id);

    return { success: true, message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente. Roles actualizados.`, updatedMember: finalUpdatedMember || undefined };
  } catch (error: any) {
    console.error("Error actualizando miembro:", error);
    return { success: false, message: `Error al actualizar miembro: ${error.message}` };
  }
}

export async function deleteMemberAction(memberId: string): Promise<{ success: boolean; message: string }> {
  'use server';
  if (!memberId) {
    return { success: false, message: "Error: ID de miembro es requerido para eliminar." };
  }
  try {
    const deletedMember = await deleteMember(memberId);
    if (!deletedMember) {
      return { success: false, message: `Error: Miembro con ID ${memberId} no encontrado.` };
    }

    // Revalida las rutas para refrescar los datos en toda la aplicación.
    revalidatePath('/members');
    revalidatePath('/groups');
    // Revalida las páginas de administración de los grupos afectados.
    if (deletedMember.assignedGDIId) revalidatePath(`/groups/gdis/${deletedMember.assignedGDIId}/admin`);
    deletedMember.assignedAreaIds?.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/admin`));

    return { success: true, message: `Miembro ${deletedMember.firstName} ${deletedMember.lastName} eliminado exitosamente.` };
  } catch (error: any) {
    console.error("Error eliminando miembro:", error);
    return { success: false, message: `Error al eliminar miembro: ${error.message}` };
  }
}

async function getMembersPageData(
  currentPageParam: number,
  pageSizeParam: number,
  searchTermParam?: string,
  memberStatusFiltersParam?: string[],
  roleFiltersParam?: string[],
  guideFiltersParam?: string[],
  areaFiltersParam?: string[] 
) {
  const { members, totalMembers, totalPages } = await getAllMembers(
    currentPageParam,
    pageSizeParam,
    searchTermParam,
    memberStatusFiltersParam
  );
  const allMembersForDropdowns = await getAllMembersNonPaginated();
  const allGDIsData = await getAllGdis();
  const allMinistryAreasData = await getAllMinistryAreas();
  const allMeetingsData = await getAllMeetings();
  const allMeetingSeriesData = await getAllMeetingSeries();
  const allAttendanceRecordsData = await getAllAttendanceRecords();
  const allTitheRecordsData = await getAllTitheRecords();
  const absoluteTotalMembers = allMembersForDropdowns.length;

  return {
    members,
    totalMembers, // This is the count AFTER filters
    totalPages,
    allMembersForDropdowns,
    allGDIs: allGDIsData,
    allMinistryAreas: allMinistryAreasData,
    allMeetings: allMeetingsData,
    allMeetingSeries: allMeetingSeriesData,
    allAttendanceRecords: allAttendanceRecordsData,
    allTitheRecords: allTitheRecordsData,
    absoluteTotalMembers, // New prop: absolute total
  };
}

interface MembersPageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    memberStatus?: string;
    role?: string;
    guide?: string;
    area?: string; 
  };
}

interface MembersPageContentProps {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  memberStatusFilterString: string;
  roleFilterString: string;
  guideFilterString: string;
  areaFilterString: string;
  currentMemberStatusFiltersArray: string[];
  currentRoleFiltersArray: string[];
  currentGuideFiltersArray: string[];
  currentAreaFiltersArray: string[];
}

async function MembersPageContent({
  currentPage,
  pageSize,
  searchTerm,
  memberStatusFilterString,
  roleFilterString,
  guideFilterString,
  areaFilterString,
  currentMemberStatusFiltersArray,
  currentRoleFiltersArray,
  currentGuideFiltersArray,
  currentAreaFiltersArray,
}: MembersPageContentProps) {
  const viewKey = `${currentPage}-${pageSize}-${searchTerm}-${memberStatusFilterString}-${roleFilterString}-${guideFilterString}-${areaFilterString}`; 

  const {
    members,
    totalMembers,
    totalPages,
    allMembersForDropdowns,
    allGDIs,
    allMinistryAreas,
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords,
    allTitheRecords,
    absoluteTotalMembers
  } = await getMembersPageData(
    currentPage,
    pageSize,
    searchTerm,
    currentMemberStatusFiltersArray,
    currentRoleFiltersArray,
    currentGuideFiltersArray,
    currentAreaFiltersArray 
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Directorio de Miembros</h1>
        <p className="text-muted-foreground mt-2">
          Visualice, busque, filtre y administre la información de los miembros.
        </p>
      </div>
      <MembersListView
        key={viewKey}
        initialMembers={members}
        allMembersForDropdowns={allMembersForDropdowns}
        allGDIs={allGDIs}
        allMinistryAreas={allMinistryAreas}
        allMeetings={allMeetings}
        allMeetingSeries={allMeetingSeries}
        allAttendanceRecords={allAttendanceRecords}
        allTitheRecords={allTitheRecords}
        addSingleMemberAction={addSingleMemberAction}
        updateMemberAction={updateMemberAction}
        deleteMemberAction={deleteMemberAction}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        currentSearchTerm={searchTerm}
        currentMemberStatusFilters={currentMemberStatusFiltersArray}
        currentRoleFilters={currentRoleFiltersArray}
        currentGuideIdFilters={currentGuideFiltersArray}
        currentAreaFilters={currentAreaFiltersArray} 
        totalMembers={totalMembers}
        absoluteTotalMembers={absoluteTotalMembers}
      />
    </div>
  );
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = new URLSearchParams(searchParams as any); // Cast to any to avoid type errors
  const currentPage = Number(params.get('page')) || 1;
  const pageSize = Number(params.get('pageSize')) || 10;
  const searchTerm = params.get('search') || '';
  const memberStatusFilterString = params.get('memberStatus') || '';
  const roleFilterString = params.get('role') || '';
  const guideFilterString = params.get('guide') || '';
  const areaFilterString = params.get('area') || ''; 
  
  const currentMemberStatusFiltersArray = memberStatusFilterString ? memberStatusFilterString.split(',') : [];
  const currentRoleFiltersArray = roleFilterString ? roleFilterString.split(',') : [];
  const currentGuideFiltersArray = guideFilterString ? guideFilterString.split(',') : [];
  const currentAreaFiltersArray = areaFilterString ? areaFilterString.split(',') : []; 

  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4 text-center"><p>Cargando...</p></div>}>
      <MembersPageContent
        currentPage={currentPage}
        pageSize={pageSize}
        searchTerm={searchTerm}
        memberStatusFilterString={memberStatusFilterString}
        roleFilterString={roleFilterString}
        guideFilterString={guideFilterString}
        areaFilterString={areaFilterString}
        currentMemberStatusFiltersArray={currentMemberStatusFiltersArray}
        currentRoleFiltersArray={currentRoleFiltersArray}
        currentGuideFiltersArray={currentGuideFiltersArray}
        currentAreaFiltersArray={currentAreaFiltersArray}
      />
    </Suspense>
  );
}