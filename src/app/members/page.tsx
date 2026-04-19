import { Suspense } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import {
	addSingleMemberAction,
	deleteMemberAction,
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
) {
	const { members, totalMembers, totalPages } = await getAllMembers(
		currentPageParam,
		pageSizeParam,
		searchTermParam,
		memberStatusFiltersParam,
		roleFiltersParam,
		guideFiltersParam,
		areaFiltersParam,
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

	const rawData = await getMembersPageData(
		currentPage,
		pageSize,
		searchTerm,
		currentMemberStatusFiltersArray,
		currentRoleFiltersArray,
		currentGuideFiltersArray,
		currentAreaFiltersArray,
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
	// Await searchParams in Next.js 15
	const resolvedParams = await searchParams;

	const currentPage = Number(resolvedParams.page) || 1;
	const pageSize = Number(resolvedParams.pageSize) || 10;
	const searchTerm = resolvedParams.search || "";
	const memberStatusFilterString = resolvedParams.memberStatus || "";
	const roleFilterString = resolvedParams.role || "";
	const guideFilterString = resolvedParams.guide || "";
	const areaFilterString = resolvedParams.area || "";

	const currentMemberStatusFiltersArray = memberStatusFilterString
		? memberStatusFilterString.split(",")
		: [];
	const currentRoleFiltersArray = roleFilterString
		? roleFilterString.split(",")
		: [];
	const currentGuideFiltersArray = guideFilterString
		? guideFilterString.split(",")
		: [];
	const currentAreaFiltersArray = areaFilterString
		? areaFilterString.split(",")
		: [];

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
				currentMemberStatusFiltersArray={currentMemberStatusFiltersArray}
				currentRoleFiltersArray={currentRoleFiltersArray}
				currentGuideFiltersArray={currentGuideFiltersArray}
				currentAreaFiltersArray={currentAreaFiltersArray}
			/>
		</Suspense>
	);
}
