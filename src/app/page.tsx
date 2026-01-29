import { parseISO } from "date-fns";
import { ArrowRight, ListX, PieChart, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import GdiOverallAttendanceChart from "@/components/dashboard/GdiOverallAttendanceChart";
import MemberRoleDistributionChart from "@/components/dashboard/MemberRoleDistributionChart";
import MissedMeetingsTable from "@/components/dashboard/MissedMeetingsTable";
import MonthlyAttendanceBreakdownCard from "@/components/dashboard/MonthlyAttendanceBreakdownCard";
import OverallMonthlyAttendanceChart from "@/components/dashboard/OverallMonthlyAttendanceChart";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<div className="container mx-auto py-8 px-4 space-y-8">
			<section className="text-center mb-8">
				<h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl">
					Dashboard Principal
				</h1>
				<p className="mt-4 text-lg leading-8 text-muted-foreground">
					Una visión general de la actividad y participación de la iglesia.
				</p>
			</section>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="flex items-center">
							<PieChart className="mr-2 h-5 w-5 text-primary" />
							Distribución de Roles
						</CardTitle>
						<CardDescription>Miembros por rol principal.</CardDescription>
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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<OverallMonthlyAttendanceChart
					allMeetings={allMeetingsData}
					allAttendanceRecords={allAttendanceData}
				/>

				<GdiOverallAttendanceChart
					gdiMeetings={gdiMeetings}
					allAttendanceRecords={allAttendanceData}
				/>

				{/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersRound className="mr-2 h-5 w-5 text-primary" />
              Asistencia a GDIs (Tendencia Mensual)
            </CardTitle>
            <CardDescription>Tendencia general de asistencia a reuniones de GDI.</CardDescription>
          </CardHeader>
          <CardContent>
            <GdiOverallAttendanceChart
              gdiMeetings={gdiMeetings}
              allAttendanceRecords={allAttendanceData}
            />
          </CardContent>
        </Card> */}
			</div>

			<Card className="col-span-1 md:col-span-2 lg:col-span-3">
				<CardHeader>
					<CardTitle className="flex items-center">
						<ListX className="mr-2 h-5 w-5 text-primary" />
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

			<section className="py-12 text-center">
				<h2 className="font-headline text-3xl font-semibold mb-4">
					Explorar Más
				</h2>
				<div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-x-6">
					<Button asChild size="lg">
						<Link href="/members">
							Ver Directorio de Miembros <Users className="ml-2" />
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link href="/events">
							Calendario de Eventos <ArrowRight className="ml-2 h-5 w-5" />
						</Link>
					</Button>
					<Button asChild variant="secondary" size="lg">
						<Link href="/groups">
							Gestionar Grupos <UsersRound className="ml-2" />
						</Link>
					</Button>
				</div>
			</section>
		</div>
	);
}
