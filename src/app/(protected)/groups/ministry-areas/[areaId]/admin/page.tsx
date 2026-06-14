export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import {
	getCachedAllAttendanceRecords,
	getSeriesForGroup,
	getCachedAllMembersNonPaginated,
	getMinistryAreaById,
	getCachedAllMinistryAreas,
	getMeetingsForGroupWithAttendees,
} from "@/lib/api/services";
import { MinistryAreaAdminView } from "./MinistryAreaAdminView";

interface PageProps {
	params: Promise<{ areaId: string }>;
}

export default async function MinistryAreaAdminPage({ params }: PageProps) {
	const { areaId } = await params;

	const ministryAreaDetails = await getMinistryAreaById(areaId);
	if (!ministryAreaDetails) notFound();

	const [allMembersData, allAttendanceRecordsData, groupSeriesData, allAreasData, areaMeetingsData] =
		await Promise.all([
			getCachedAllMembersNonPaginated(),
			getCachedAllAttendanceRecords(),
			getSeriesForGroup("ministryArea", areaId),
			getCachedAllMinistryAreas(),
			getMeetingsForGroupWithAttendees("ministryArea", areaId),
		]);

	const areaMemberIds = new Set([
		ministryAreaDetails.leaderId,
		...ministryAreaDetails.memberIds,
	]);
	const areaMembers = allMembersData
		.filter((m) => areaMemberIds.has(m.id))
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
		);

	return (
		<MinistryAreaAdminView
			ministryArea={ministryAreaDetails}
			allMembers={allMembersData}
			activeMembers={allMembersData.filter((m) => m.status === "vigente")}
			allAreas={allAreasData}
			groupMeetingSeries={groupSeriesData.sort((a, b) => a.name.localeCompare(b.name))}
			allMeetings={areaMeetingsData}
			allAttendanceRecords={allAttendanceRecordsData}
			areaMembers={areaMembers}
		/>
	);
}
