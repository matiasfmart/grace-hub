import { Suspense } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import {
	addSingleMemberAction,
	deleteMemberAction,
	restoreMemberAction,
	softDeleteMemberAction,
	updateMemberAction,
} from "@/app/(protected)/actions/memberActions";
import MembersListView from "@/components/members/members-list-view";
import MembersTabsHeader from "@/components/members/members-tabs-header";
import BajasTabContent from "@/components/members/bajas-tab-content";
import ProspectsTabContent from "@/components/prospects/prospects-tab-content";
import { Button } from "@/components/ui/button";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getAllMeetingSeries,
	getAllMeetings,
	getAllMembers,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
	getAllRoleTypes,
	prospectsService,
} from "@/lib/api/services";

// ---- Preset conversion helpers (server-side) ----
function toDateStr(d: Date): string {
	return d.toISOString().split("T")[0];
}

function getJoinDateRange(preset: string): { joinFrom?: string; joinTo?: string } {
	const now = new Date();
	switch (preset) {
		case "month": {
			const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
			return { joinFrom: toDateStr(firstDay), joinTo: toDateStr(now) };
		}
		case "3m": {
			const from = new Date(now);
			from.setMonth(from.getMonth() - 3);
			return { joinFrom: toDateStr(from), joinTo: toDateStr(now) };
		}
		case "6m": {
			const from = new Date(now);
			from.setMonth(from.getMonth() - 6);
			return { joinFrom: toDateStr(from), joinTo: toDateStr(now) };
		}
		case "year": {
			const firstDay = new Date(now.getFullYear(), 0, 1);
			return { joinFrom: toDateStr(firstDay), joinTo: toDateStr(now) };
		}
		default:
			return {};
	}
}

function getAgeRange(preset: string): { ageMin?: number; ageMax?: number } {
	switch (preset) {
		case "kids":   return { ageMin: 0, ageMax: 12 };
		case "teen":   return { ageMin: 13, ageMax: 17 };
		case "youth":  return { ageMin: 18, ageMax: 29 };
		case "adult":  return { ageMin: 30, ageMax: 59 };
		case "senior": return { ageMin: 60 };
		default:       return {};
	}
}

/** Converts "YYYY-MM" strings to full ISO date strings for the API. */
function convertMonthYearToDateRange(
	from: string,
	to: string,
): { joinFrom: string; joinTo: string } {
	const [toYear, toMonth] = to.split("-").map(Number);
	const lastDay = new Date(toYear, toMonth, 0).getDate();
	return {
		joinFrom: `${from}-01`,
		joinTo: `${to}-${String(lastDay).padStart(2, "0")}`,
	};
}

// Limpia cualquier Symbol de los datos para evitar errores de serialización
function removeSymbols(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(removeSymbols);
	} else if (obj && typeof obj === "object") {
		const clean: any = {};
		for (const key in obj) {
			if (typeof obj[key] !== "symbol") {
				clean[key] = removeSymbols(obj[key]);
			}
		}
		return clean;
	}
	return obj;
}

async function getMembersPageData(
	currentPageParam: number,
	pageSizeParam: number,
	searchTermParam?: string,
	memberStatusFiltersParam?: string[],
	roleFiltersParam?: string[],
	guideFiltersParam?: string[],
	areaFiltersParam?: string[],
	joinPreset?: string,
	agePreset?: string,
	/** YYYY-MM — used only when joinPreset === "custom" */
	customJoinFrom?: string,
	/** YYYY-MM — used only when joinPreset === "custom" */
	customJoinTo?: string,
	/** used only when agePreset === "custom" */
	customAgeMin?: number,
	/** used only when agePreset === "custom" */
	customAgeMax?: number,
	sortBy?: 'fullName' | 'churchJoinDate' | 'birthDate',
	sortOrder?: 'asc' | 'desc',
	ecclesiasticalRoleTypeIds?: number[],
) {
	let joinDateFrom: string | undefined;
	let joinDateTo: string | undefined;
	let ageMin: number | undefined;
	let ageMax: number | undefined;

	if (joinPreset === "custom") {
		if (customJoinFrom && customJoinTo) {
			const range = convertMonthYearToDateRange(customJoinFrom, customJoinTo);
			joinDateFrom = range.joinFrom;
			joinDateTo = range.joinTo;
		}
	} else if (joinPreset) {
		const range = getJoinDateRange(joinPreset);
		joinDateFrom = range.joinFrom;
		joinDateTo = range.joinTo;
	}

	if (agePreset === "custom") {
		ageMin = customAgeMin;
		ageMax = customAgeMax;
	} else if (agePreset) {
		const range = getAgeRange(agePreset);
		ageMin = range.ageMin;
		ageMax = range.ageMax;
	}

	const [
		{ members, totalMembers, totalPages },
		allMembersForDropdowns,
		allGDIsData,
		allMinistryAreasData,
		allMeetingsData,
		allMeetingSeriesData,
		allAttendanceRecordsData,
		allRoleTypesData,
	] = await Promise.all([
		getAllMembers(
			currentPageParam,
			pageSizeParam,
			searchTermParam,
			memberStatusFiltersParam,
			roleFiltersParam,
			guideFiltersParam,
			areaFiltersParam,
			joinDateFrom,
			joinDateTo,
			ageMin,
			ageMax,
			sortBy,
			sortOrder,
			ecclesiasticalRoleTypeIds,
		),
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllMinistryAreas(),
		getAllMeetings(),
		getAllMeetingSeries(),
		getAllAttendanceRecords(),
		getAllRoleTypes(),
	]);
	const absoluteTotalMembers = allMembersForDropdowns.length;

	return {
		members,
		totalMembers,
		totalPages,
		allMembersForDropdowns,
		allGDIs: allGDIsData,
		allMinistryAreas: allMinistryAreasData,
		allMeetings: allMeetingsData,
		allMeetingSeries: allMeetingSeriesData,
		allAttendanceRecords: allAttendanceRecordsData,
		allRoleTypes: allRoleTypesData,
		absoluteTotalMembers,
	};
}

interface MembersPageProps {
	searchParams: Promise<{
		tab?: string;
		page?: string;
		pageSize?: string;
		search?: string;
		memberStatus?: string;
		role?: string;
		guide?: string;
		area?: string;
		label?: string;
		joinPreset?: string;
		agePreset?: string;
		/** YYYY-MM — used when joinPreset === "custom" */
		joinFrom?: string;
		/** YYYY-MM — used when joinPreset === "custom" */
		joinTo?: string;
		/** used when agePreset === "custom" */
		ageMin?: string;
		/** used when agePreset === "custom" */
		ageMax?: string;
		sortBy?: string;
		sortOrder?: string;
	}>;
}

interface MembersPageContentProps {
	currentPage: number;
	pageSize: number;
	searchTerm: string;
	memberStatusFilterString: string;
	roleFilterString: string;
	guideFilterString: string;
	areaFilterString: string;
	joinPreset: string;
	agePreset: string;
	customJoinFrom: string;
	customJoinTo: string;
	customAgeMin: string;
	customAgeMax: string;
	currentMemberStatusFiltersArray: string[];
	currentRoleFiltersArray: string[];
	currentGuideFiltersArray: string[];
	currentAreaFiltersArray: string[];
	currentLabelFiltersArray: number[];
	sortBy: 'fullName' | 'churchJoinDate' | 'birthDate';
	sortOrder: 'asc' | 'desc';
}

async function MembersListOnly({
	currentPage,
	pageSize,
	searchTerm,
	memberStatusFilterString,
	roleFilterString,
	guideFilterString,
	areaFilterString,
	joinPreset,
	agePreset,
	customJoinFrom,
	customJoinTo,
	customAgeMin,
	customAgeMax,
	currentMemberStatusFiltersArray,
	currentRoleFiltersArray,
	currentGuideFiltersArray,
	currentAreaFiltersArray,
	currentLabelFiltersArray,
	sortBy,
	sortOrder,
}: MembersPageContentProps) {
	const viewKey = `${currentPage}-${pageSize}-${memberStatusFilterString}-${roleFilterString}-${guideFilterString}-${areaFilterString}-${joinPreset}-${agePreset}-${customJoinFrom}-${customJoinTo}-${customAgeMin}-${customAgeMax}-${currentLabelFiltersArray.join(',')}`;

	const rawData = await getMembersPageData(
		currentPage,
		pageSize,
		searchTerm,
		currentMemberStatusFiltersArray,
		currentRoleFiltersArray,
		currentGuideFiltersArray,
		currentAreaFiltersArray,
		joinPreset || undefined,
		agePreset || undefined,
		customJoinFrom || undefined,
		customJoinTo || undefined,
		customAgeMin ? parseInt(customAgeMin, 10) : undefined,
		customAgeMax ? parseInt(customAgeMax, 10) : undefined,
		sortBy,
		sortOrder,
		currentLabelFiltersArray.length ? currentLabelFiltersArray : undefined,
	);
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
		allRoleTypes,
		absoluteTotalMembers,
	} = removeSymbols(rawData);

	return (
		<MembersListView
				key={viewKey}
				initialMembers={members}
				allMembersForDropdowns={allMembersForDropdowns}
				allGDIs={allGDIs}
				allMinistryAreas={allMinistryAreas}
				allMeetings={allMeetings}
				allMeetingSeries={allMeetingSeries}
				allAttendanceRecords={allAttendanceRecords}
				allRoleTypes={allRoleTypes}
				addSingleMemberAction={addSingleMemberAction}
				updateMemberAction={updateMemberAction}
			softDeleteMemberAction={softDeleteMemberAction}
				currentPage={currentPage}
				totalPages={totalPages}
				pageSize={pageSize}
				currentSearchTerm={searchTerm}
				currentRoleFilters={currentRoleFiltersArray}
				currentGuideIdFilters={currentGuideFiltersArray}
				currentAreaFilters={currentAreaFiltersArray}
				currentLabelFilters={currentLabelFiltersArray}
				currentJoinPreset={joinPreset}
				currentAgePreset={agePreset}
				currentJoinFrom={customJoinFrom}
				currentJoinTo={customJoinTo}
				currentAgeMin={customAgeMin ? parseInt(customAgeMin, 10) : undefined}
				currentAgeMax={customAgeMax ? parseInt(customAgeMax, 10) : undefined}
				totalMembers={totalMembers}
				absoluteTotalMembers={absoluteTotalMembers}
				currentSortBy={sortBy}
				currentSortOrder={sortOrder}
			/>
	);
}

export default async function MembersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string>>;
}) {
	const resolvedParams = await searchParams;
	const activeTab = resolvedParams.tab === "nuevos" || resolvedParams.tab === "bajas"
		? resolvedParams.tab
		: "miembros";

	// ── Tab: Nuevos ingresos ──────────────────────────────────────────────────
	if (activeTab === "nuevos") {
		const [pendingProspects, allGDIsData, allMembersData, pendingCount] = await Promise.all([
			prospectsService.getPending(),
			getAllGdis(),
			getAllMembersNonPaginated(),
			prospectsService.countPending(),
		]);
		return (
			<div className="space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">Miembros</h1>
						<p className="text-sm text-muted-foreground">Gestiona el ciclo de vida de los miembros de la congregación.</p>
					</div>
					<MembersTabsHeader activeTab="nuevos" pendingProspectsCount={pendingCount} />
				</div>
				<Suspense fallback={<div className="py-8 text-center"><p>Cargando...</p></div>}>
					<ProspectsTabContent initialPending={pendingProspects} allGDIs={allGDIsData} allMembers={allMembersData} />
				</Suspense>
			</div>
		);
	}

	// ── Tab: Dados de baja ───────────────────────────────────────────────────
	if (activeTab === "bajas") {
		const [allMembersData, allAttendanceData, allMeetingsData, allGDIsData, pendingCount] =
			await Promise.all([
				getAllMembersNonPaginated(),
				getAllAttendanceRecords(),
				getAllMeetings(),
				getAllGdis(),
				prospectsService.countPending(),
			]);
		const eliminadosMembers = allMembersData.filter((m) => m.status === "eliminado");
		return (
			<div className="space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">Miembros</h1>
						<p className="text-sm text-muted-foreground">Gestiona el ciclo de vida de los miembros de la congregación.</p>
					</div>
					<MembersTabsHeader activeTab="bajas" pendingProspectsCount={pendingCount} />
				</div>
				<BajasTabContent
					eliminadosMembers={eliminadosMembers}
					allAttendanceRecords={allAttendanceData}
					allMeetings={allMeetingsData}
					allGDIs={allGDIsData}
					restoreMemberAction={restoreMemberAction}
					deleteMemberAction={deleteMemberAction}
				/>
			</div>
		);
	}

	// ── Tab: Miembros (default — existing behavior) ──────────────────────────
	const currentPage = Number(resolvedParams.page) || 1;
	const pageSize = Number(resolvedParams.pageSize) || 10;
	const searchTerm = resolvedParams.search || "";
	const memberStatusFilterString = resolvedParams.memberStatus || "";
	const roleFilterString = resolvedParams.role || "";
	const guideFilterString = resolvedParams.guide || "";
	const areaFilterString = resolvedParams.area || "";
	const labelFilterString = resolvedParams.label || "";
	const joinPreset = resolvedParams.joinPreset || "";
	const agePreset = resolvedParams.agePreset || "";
	const customJoinFrom = resolvedParams.joinFrom || "";
	const customJoinTo = resolvedParams.joinTo || "";
	const customAgeMin = resolvedParams.ageMin || "";
	const customAgeMax = resolvedParams.ageMax || "";
	const sortBy = (resolvedParams.sortBy === 'churchJoinDate' || resolvedParams.sortBy === 'birthDate')
		? resolvedParams.sortBy
		: 'fullName';
	const sortOrder: 'asc' | 'desc' = resolvedParams.sortOrder === 'desc' ? 'desc' : 'asc';

	const currentMemberStatusFiltersArray = memberStatusFilterString
		? memberStatusFilterString.split(",")
		: ["vigente"];
	const currentRoleFiltersArray = roleFilterString ? roleFilterString.split(",") : [];
	const currentGuideFiltersArray = guideFilterString ? guideFilterString.split(",") : [];
	const currentAreaFiltersArray = areaFilterString ? areaFilterString.split(",") : [];
	const currentLabelFiltersArray = labelFilterString
		? labelFilterString.split(',').map(Number).filter(n => !isNaN(n))
		: [];

	// Fetch pending count for the tab badge (lightweight endpoint)
	const pendingCount = await prospectsService.countPending();

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">Miembros</h1>
					<p className="text-sm text-muted-foreground">Gestiona el ciclo de vida de los miembros de la congregación.</p>
				</div>
				<div className="flex items-center gap-3 shrink-0">
					<Button variant="outline" size="sm" asChild>
						<Link href="/members/settings/role-types">
							<Tag className="h-4 w-4 mr-2" />
							Etiquetas
						</Link>
					</Button>
					<MembersTabsHeader activeTab="miembros" pendingProspectsCount={pendingCount} />
				</div>
			</div>
			<Suspense
				fallback={
					<div className="container mx-auto py-8 px-4 text-center">
						<p>Cargando...</p>
					</div>
				}
			>
				<MembersListOnly
					currentPage={currentPage}
					pageSize={pageSize}
					searchTerm={searchTerm}
					memberStatusFilterString={memberStatusFilterString}
					roleFilterString={roleFilterString}
					guideFilterString={guideFilterString}
					areaFilterString={areaFilterString}
					joinPreset={joinPreset}
					agePreset={agePreset}
					customJoinFrom={customJoinFrom}
					customJoinTo={customJoinTo}
					customAgeMin={customAgeMin}
					customAgeMax={customAgeMax}
					currentMemberStatusFiltersArray={currentMemberStatusFiltersArray}
					currentRoleFiltersArray={currentRoleFiltersArray}
					currentGuideFiltersArray={currentGuideFiltersArray}
					currentAreaFiltersArray={currentAreaFiltersArray}
					currentLabelFiltersArray={currentLabelFiltersArray}
					sortBy={sortBy}
					sortOrder={sortOrder}
				/>
			</Suspense>
		</div>
	);
}
