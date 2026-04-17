import { parseISO } from "date-fns";
import GdiOverallAttendanceChart from "@/components/dashboard/GdiOverallAttendanceChart";
import MemberRoleDistributionChart from "@/components/dashboard/MemberRoleDistributionChart";
import MissedMeetingsTable from "@/components/dashboard/MissedMeetingsTable";
import MonthlyAttendanceBreakdownCard from "@/components/dashboard/MonthlyAttendanceBreakdownCard";
import OverallMonthlyAttendanceChart from "@/components/dashboard/OverallMonthlyAttendanceChart";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
	getAllAttendanceRecords,
	getAllGdis,
	getAllMeetingSeries,
	getAllMeetings,
	getAllMembersNonPaginated,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDashboardData() {
	const [
		allMeetingsData,
		allMembersData,
		allAttendanceData,
		allSeriesData,
		allGdisData,
	] = await Promise.all([
		getAllMeetings(),
		getAllMembersNonPaginated(),
		getAllAttendanceRecords(),
		getAllMeetingSeries(),
		getAllGdis(),
	]);

	const gdiSeriesIds = new Set(
		allSeriesData.filter((s) => s.seriesType === "gdi").map((s) => s.id),
	);
	const gdiMeetings = allMeetingsData.filter((m) =>
		gdiSeriesIds.has(m.seriesId),
	);

	const generalSeries = allSeriesData.filter((s) => s.seriesType === "general");
	const generalSeriesIds = new Set(generalSeries.map((s) => s.id));

	const generalMeetingsSorted = allMeetingsData
		.filter((m) => generalSeriesIds.has(m.seriesId))
		.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

	return {
		allMeetingsData,
		allAttendanceData,
		allMembersData,
		gdiMeetings,
		generalMeetingsSorted,
		allSeriesData,
		allGdisData,
	};
}

export default async function DashboardPage() {
	const {
		allMeetingsData,
		allAttendanceData,
		allMembersData,
		gdiMeetings,
		generalMeetingsSorted,
		allSeriesData,
		allGdisData,
	} = await getDashboardData();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				description="Visión general de la actividad y participación de la iglesia."
			/>

			{/* KPI Cards Row */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Distribución de Roles
						</CardTitle>
					</CardHeader>
					<CardContent>
						<MemberRoleDistributionChart allMembers={allMembersData} />
					</CardContent>
				</Card>

				<MonthlyAttendanceBreakdownCard
					allMeetings={allMeetingsData}
					allAttendanceRecords={allAttendanceData}
					allMembers={allMembersData}
					allMeetingSeries={allSeriesData}
				/>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<OverallMonthlyAttendanceChart
					allMeetings={allMeetingsData}
					allAttendanceRecords={allAttendanceData}
				/>

				<GdiOverallAttendanceChart
					gdiMeetings={gdiMeetings}
					allAttendanceRecords={allAttendanceData}
				/>
			</div>

			{/* Missed Meetings - Full Width */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold">
						Miembros Ausentes en Reuniones Generales Recientes
					</CardTitle>
					<CardDescription>
						Identifica miembros que faltaron a las últimas reuniones generales.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<MissedMeetingsTable
						generalMeetingsSorted={generalMeetingsSorted}
						allMembers={allMembersData}
						allAttendanceRecords={allAttendanceData}
						allMeetingSeries={allSeriesData}
						allGdis={allGdisData}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
