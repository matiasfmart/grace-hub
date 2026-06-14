import type { Member, MemberRoleType } from "@/lib/types";
import {
	MemberRoleEnum,
	NO_AREA_FILTER_VALUE,
	NO_GDI_FILTER_VALUE,
	NO_ROLE_FILTER_VALUE,
} from "@/lib/types";
import {
	getCachedAllGdis,
	getAllMembers,
	getCachedAllMembersNonPaginated,
	getCachedAllMinistryAreas,
	getAllTitheRecords,
} from "@/lib/api/services";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TithesTracker } from "@/components/tithes/TithesTracker";

const roleDisplayMap: Record<MemberRoleType, string> = {
	GdiGuide: "Guía GDI",
	GdiMentor: "Mentor GDI",
	AreaLeader: "Líder Área",
	AreaMentor: "Mentor Área",
	Worker: "Obrero",
};
const roleFilterOptions: {
	value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE;
	label: string;
}[] = [
	...(Object.keys(MemberRoleEnum.Values) as MemberRoleType[]).map((role) => ({
		value: role,
		label: roleDisplayMap[role] || role,
	})),
	{ value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" },
];

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};
const statusFilterOptions: { value: Member["status"]; label: string }[] =
	Object.entries(statusDisplayMap).map(([value, label]) => ({
		value: value as Member["status"],
		label,
	}));

async function getTithesPageData(searchParams: {
	page?: string;
	pageSize?: string;
	search?: string;
	status?: string;
	role?: string;
	guide?: string;
	area?: string;
	startDate?: string;
	endDate?: string;
}) {
	const currentPage = Number(searchParams.page) || 1;
	const pageSize = Number(searchParams.pageSize) || 25;
	const searchTerm = searchParams.search || "";
	const memberStatusFilterString = searchParams.status || "";
	const roleFilterString = searchParams.role || "";
	const guideFilterString = searchParams.guide || "";
	const areaFilterString = searchParams.area || "";

	const currentMemberStatusFiltersArray = memberStatusFilterString
		? memberStatusFilterString.split(",")
		: [];
	const currentRoleFiltersArray = roleFilterString
		? roleFilterString.split(",")
		: [];
	const currentGdiFiltersArray = guideFilterString
		? guideFilterString.split(",")
		: [];
	const currentAreaFiltersArray = areaFilterString
		? areaFilterString.split(",")
		: [];

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
			currentMemberStatusFiltersArray,
			currentRoleFiltersArray,
			currentGdiFiltersArray,
			currentAreaFiltersArray,
		),
		getCachedAllMembersNonPaginated(),
		getCachedAllGdis(),
		getCachedAllMinistryAreas(),
		getAllTitheRecords(),
	]);

	// Derive all filtered members client-side from the full list (avoids pageSize limit)
	const searchLower = searchTerm.toLowerCase();
	const allFilteredMembers = allMembersForDropdowns.filter((m) => {
		if (currentMemberStatusFiltersArray.length > 0 && !currentMemberStatusFiltersArray.includes(m.status)) return false;
		if (currentRoleFiltersArray.length > 0) {
			const hasRole = currentRoleFiltersArray.some((rf) => {
				if (rf === NO_ROLE_FILTER_VALUE) return !m.roles || m.roles.length === 0;
				return m.roles?.includes(rf as MemberRoleType);
			});
			if (!hasRole) return false;
		}
		if (currentGdiFiltersArray.length > 0) {
			const hasGdi = currentGdiFiltersArray.some((gf) => {
				if (gf === NO_GDI_FILTER_VALUE) return !m.assignedGDIId;
				return m.assignedGDIId === gf;
			});
			if (!hasGdi) return false;
		}
		if (currentAreaFiltersArray.length > 0) {
			const hasArea = currentAreaFiltersArray.some((af) => {
				if (af === NO_AREA_FILTER_VALUE) return !m.assignedAreaIds || m.assignedAreaIds.length === 0;
				return m.assignedAreaIds?.includes(af);
			});
			if (!hasArea) return false;
		}
		if (searchTerm) {
			const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
			if (!fullName.includes(searchLower) && !m.email.toLowerCase().includes(searchLower)) return false;
		}
		return true;
	});

	const absoluteTotalMembers = allMembersForDropdowns.length;

	const gdiFilterOptions = [
		{ value: NO_GDI_FILTER_VALUE, label: "Miembros Sin GDI Asignado" },
		...allGDIs.map((gdi) => ({
			value: gdi.id,
			label: `${gdi.name} (Guía: ${allMembersForDropdowns.find((m) => m.id === gdi.guideId)?.firstName || ""} ${allMembersForDropdowns.find((m) => m.id === gdi.guideId)?.lastName || "N/A"})`,
		})),
	];

	const areaFilterOptions = [
		{ value: NO_AREA_FILTER_VALUE, label: "Miembros Sin Área Asignada" },
		...allMinistryAreas.map((area) => ({
			value: area.id,
			label: `${area.name} (Líder: ${allMembersForDropdowns.find((m) => m.id === area.leaderId)?.firstName || ""} ${allMembersForDropdowns.find((m) => m.id === area.leaderId)?.lastName || "N/A"})`,
		})),
	];

	return {
		members,
		allFilteredMembers,
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
			currentRoleFilters: currentRoleFiltersArray,
			currentStatusFilters: currentMemberStatusFiltersArray,
			currentGdiFilters: currentGdiFiltersArray,
			currentAreaFilters: currentAreaFiltersArray,
		},
		absoluteTotalMembers,
	};
}

interface TithesPageProps {
	searchParams?: Promise<{
		page?: string;
		pageSize?: string;
		search?: string;
		status?: string;
		role?: string;
		guide?: string;
		area?: string;
		startDate?: string;
		endDate?: string;
	}>;
}

export default async function TithesPage({ searchParams }: TithesPageProps) {
	const params = await searchParams;
	const {
		members,
		allFilteredMembers,
		totalMembers,
		totalPages,
		currentPage,
		pageSize,
		allTitheRecords,
		filters,
		absoluteTotalMembers,
	} = await getTithesPageData(params || {});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Diezmos"
				description="Registro y seguimiento de diezmos por miembro."
			/>
			<TithesTracker
				initialMembers={members}
				allFilteredMembers={allFilteredMembers}
				initialTitheRecords={allTitheRecords}
				totalMembers={totalMembers}
				totalPages={totalPages}
				currentPage={currentPage}
				pageSize={pageSize}
				absoluteTotalMembers={absoluteTotalMembers}
				filters={filters}
				initialStartDate={params?.startDate}
				initialEndDate={params?.endDate}
			/>
		</div>
	);
}
