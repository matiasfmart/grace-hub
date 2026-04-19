import type { Member, MemberRoleType } from "@/lib/types";
import {
	MemberRoleEnum,
	NO_AREA_FILTER_VALUE,
	NO_GDI_FILTER_VALUE,
	NO_ROLE_FILTER_VALUE,
} from "@/lib/types";
import {
	getAllGdis,
	getAllMembers,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
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

	const currentMemberStatusFiltersArray = memberStatusFilterString
		? memberStatusFilterString.split(",")
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
		),
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllMinistryAreas(),
		getAllTitheRecords(),
	]);

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
