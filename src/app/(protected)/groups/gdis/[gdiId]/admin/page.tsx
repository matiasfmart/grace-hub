import { notFound } from "next/navigation";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getGdiById,
	getSeriesForGroup,
	getAllMembersNonPaginated,
	getMeetingsForGroupWithAttendees,
} from "@/lib/api/services";
import { GdiAdminView } from "./GdiAdminView";

interface PageProps {
	params: Promise<{ gdiId: string }>;
}

export default async function GdiAdminPage({ params }: PageProps) {
	const { gdiId } = await params;

	const gdiDetails = await getGdiById(gdiId);
	if (!gdiDetails) notFound();

	const [
		allMembersData,
		allGdisData,
		allAttendanceRecordsData,
		groupSeriesData,
		gdiMeetingsData,
	] = await Promise.all([
		getAllMembersNonPaginated(),
		getAllGdis(),
		getAllAttendanceRecords(),
		getSeriesForGroup("gdi", gdiId),
		getMeetingsForGroupWithAttendees("gdi", gdiId),
	]);

	const sortedGroupSeries = groupSeriesData.sort((a, b) => a.name.localeCompare(b.name));

	const gdiMemberIds = new Set([gdiDetails.guideId, ...gdiDetails.memberIds]);
	const gdiMembers = allMembersData
		.filter((member) => gdiMemberIds.has(member.id))
		.sort((a, b) =>
			`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
		);

	return (
		<GdiAdminView
			gdi={gdiDetails}
			allMembers={allMembersData}
			activeMembers={allMembersData.filter((m) => m.status === "vigente")}
			allGdis={allGdisData}
			groupMeetingSeries={sortedGroupSeries}
			allMeetings={gdiMeetingsData}
			allAttendanceRecords={allAttendanceRecordsData}
			gdiMembers={gdiMembers}
		/>
	);
}
