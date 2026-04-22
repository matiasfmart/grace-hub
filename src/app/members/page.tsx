import { Suspense } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import {
	addSingleMemberAction,
	deleteMemberAction,
	restoreMemberAction,
	softDeleteMemberAction,
	updateMemberAction,
} from "@/app/actions/memberActions";
import MembersListView from "@/components/members/members-list-view";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getAllMeetingSeries,
	getAllMeetings,
	getAllMembers,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
	getAllRoleTypes,
	getAllTitheRecords,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

	const { members, totalMembers, totalPages } = await getAllMembers(
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
	);
	const allMembersForDropdowns = await getAllMembersNonPaginated();
	const allGDIsData = await getAllGdis();
	const allMinistryAreasData = await getAllMinistryAreas();
	const allMeetingsData = await getAllMeetings();
	const allMeetingSeriesData = await getAllMeetingSeries();
	const allAttendanceRecordsData = await getAllAttendanceRecords();
	const allTitheRecordsData = await getAllTitheRecords();
	const allRoleTypesData = await getAllRoleTypes();
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
		allRoleTypes: allRoleTypesData,
		absoluteTotalMembers, // New prop: absolute total
	};
}

interface MembersPageProps {
	searchParams: Promise<{
		page?: string;
		pageSize?: string;
		search?: string;
		memberStatus?: string;
		role?: string;
		guide?: string;
		area?: string;
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
}

async function MembersPageContent({
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
}: MembersPageContentProps) {
	const viewKey = `${currentPage}-${pageSize}-${memberStatusFilterString}-${roleFilterString}-${guideFilterString}-${areaFilterString}-${joinPreset}-${agePreset}-${customJoinFrom}-${customJoinTo}-${customAgeMin}-${customAgeMax}`;

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
		allTitheRecords,
		allRoleTypes,
		absoluteTotalMembers,
	} = removeSymbols(rawData);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Miembros"
				description="Gestiona la información de los miembros de la congregación."
				actions={
					<Button variant="outline" size="sm" asChild>
						<Link href="/members/settings/role-types">
							<Tag className="h-4 w-4 mr-2" />
							Etiquetas
						</Link>
					</Button>
				}
			/>
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
				allRoleTypes={allRoleTypes}
				addSingleMemberAction={addSingleMemberAction}
				updateMemberAction={updateMemberAction}
				deleteMemberAction={deleteMemberAction}
				softDeleteMemberAction={softDeleteMemberAction}
				restoreMemberAction={restoreMemberAction}
				currentPage={currentPage}
				totalPages={totalPages}
				pageSize={pageSize}
				currentSearchTerm={searchTerm}
				currentRoleFilters={currentRoleFiltersArray}
				currentGuideIdFilters={currentGuideFiltersArray}
				currentAreaFilters={currentAreaFiltersArray}
				currentJoinPreset={joinPreset}
				currentAgePreset={agePreset}
				currentJoinFrom={customJoinFrom}
				currentJoinTo={customJoinTo}
				currentAgeMin={customAgeMin ? parseInt(customAgeMin, 10) : undefined}
				currentAgeMax={customAgeMax ? parseInt(customAgeMax, 10) : undefined}
				totalMembers={totalMembers}
				absoluteTotalMembers={absoluteTotalMembers}
			/>
		</div>
	);
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
	const resolvedParams = await searchParams;

	const currentPage = Number(resolvedParams.page) || 1;
	const pageSize = Number(resolvedParams.pageSize) || 10;
	const searchTerm = resolvedParams.search || "";
	const memberStatusFilterString = resolvedParams.memberStatus || "";
	const roleFilterString = resolvedParams.role || "";
	const guideFilterString = resolvedParams.guide || "";
	const areaFilterString = resolvedParams.area || "";
	const joinPreset = resolvedParams.joinPreset || "";
	const agePreset = resolvedParams.agePreset || "";
	const customJoinFrom = resolvedParams.joinFrom || "";
	const customJoinTo = resolvedParams.joinTo || "";
	const customAgeMin = resolvedParams.ageMin || "";
	const customAgeMax = resolvedParams.ageMax || "";

	const currentMemberStatusFiltersArray = memberStatusFilterString
		? memberStatusFilterString.split(",")
		: ["vigente"];
	const currentRoleFiltersArray = roleFilterString ? roleFilterString.split(",") : [];
	const currentGuideFiltersArray = guideFilterString ? guideFilterString.split(",") : [];
	const currentAreaFiltersArray = areaFilterString ? areaFilterString.split(",") : [];

	return (
		<Suspense
			fallback={
				<div className="container mx-auto py-8 px-4 text-center">
					<p>Cargando...</p>
				</div>
			}
		>
			<MembersPageContent
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
			/>
		</Suspense>
	);
}
