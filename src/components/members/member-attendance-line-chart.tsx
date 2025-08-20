
"use client";

import React, { useMemo } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart as LineChartIcon, CalendarRange } from 'lucide-react';
import { format, parseISO, isValid, startOfDay, endOfDay, isPast, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MemberAttendanceLineChartProps {
  memberId: string;
  memberName: string;
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
  selectedSeriesId: string;
  startDate?: Date;
  endDate?: Date;
}

interface MonthlyChartDataPoint {
  monthValue: string; // YYYY-MM
  monthDisplay: string; // Formatted for X-axis (e.g., "jun 2025")
  attendedCount: number;
  convocatedCount: number;
  attendancePercentage: number; // New: (attendedCount / convocatedCount) * 100
}

const chartConfig = {
  attendancePercentage: { // Changed from attendedCount
    label: "Asistencia (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const formatDateRangeTextForChart = (seriesName?: string, startDate?: Date, endDate?: Date): string => {
  let dateText = "";
  if (startDate && endDate && startDate <= endDate) {
    dateText = `entre ${format(startDate, "dd/MM/yy", { locale: es })} y ${format(endDate, "dd/MM/yy", { locale: es })}`;
  } else if (startDate) {
    dateText = `desde ${format(startDate, "dd/MM/yy", { locale: es })}`;
  } else if (endDate) {
    dateText = `hasta ${format(endDate, "dd/MM/yy", { locale: es })}`;
  }

  let seriesText = seriesName ? `para la serie "${seriesName}"` : "para todas las series relevantes";
  if (seriesName === "Todas las Series Relevantes") seriesText = "para todas las series relevantes";

  if (dateText) {
    return `Porcentaje de asistencia mensual ${seriesText}, ${dateText}.`;
  }
  return `Porcentaje de asistencia mensual ${seriesText}.`;
};


export default function MemberAttendanceLineChart({
  memberId,
  memberName,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
  selectedSeriesId,
  startDate,
  endDate,
}: MemberAttendanceLineChartProps) {

  const { chartData, relevantSeriesName } = useMemo(() => {
    let memberExpectedMeetings = allMeetings.filter(meeting => {
      const series = allMeetingSeries.find(s => s.id === meeting.seriesId);
      if (!series) return false;

      if (series.seriesType === 'general') {
        if (series.targetAttendeeGroups.includes('allMembers')) return true;
        return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
      } else {
        return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
      }
    });

    let meetingsToProcess = memberExpectedMeetings;
    let currentSeriesName = "Todas las Series Relevantes";

    if (selectedSeriesId !== 'all') {
      meetingsToProcess = meetingsToProcess.filter(meeting => meeting.seriesId === selectedSeriesId);
      const foundSeries = allMeetingSeries.find(s => s.id === selectedSeriesId);
      if (foundSeries) currentSeriesName = foundSeries.name;
    }

    interface MonthlyAggregation {
      attended: number;
      convocated: number;
    }
    const monthlyAggregationMap: Record<string, MonthlyAggregation> = {};

    meetingsToProcess.forEach(meeting => {
      const meetingDateObj = parseISO(meeting.date);
      if (!isValid(meetingDateObj)) return;
      const yearMonth = format(meetingDateObj, 'yyyy-MM');

      if (!monthlyAggregationMap[yearMonth]) {
        monthlyAggregationMap[yearMonth] = { attended: 0, convocated: 0 };
      }
      monthlyAggregationMap[yearMonth].convocated += 1;

      const attendanceRecord = allAttendanceRecords.find(
        record => record.meetingId === meeting.id && record.memberId === memberId
      );
      if (attendanceRecord?.attended) {
        monthlyAggregationMap[yearMonth].attended += 1;
      }
    });

    const dataPoints: MonthlyChartDataPoint[] = Object.entries(monthlyAggregationMap)
      .map(([yearMonth, counts]) => {
        const attendancePercentage = counts.convocated > 0 ? (counts.attended / counts.convocated) * 100 : 0;
        return {
          monthValue: yearMonth,
          monthDisplay: format(parseISO(`${yearMonth}-01`), 'MMM yyyy', { locale: es }),
          attendedCount: counts.attended,
          convocatedCount: counts.convocated,
          attendancePercentage: attendancePercentage,
        };
      })
      .sort((a, b) => a.monthValue.localeCompare(b.monthValue));

    return { chartData: dataPoints, relevantSeriesName: currentSeriesName };

  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId, startDate, endDate]);

  const chartDescriptionText = formatDateRangeTextForChart(relevantSeriesName, startDate, endDate);


  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <LineChartIcon className="mr-2 h-5 w-5" />
          Tendencia Mensual de Asistencia (%)
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground pt-1 flex items-center">
           <CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" /> {chartDescriptionText}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -5, bottom: 50 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="monthDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-40}
                textAnchor="end"
                height={70}
                interval="preserveStartEnd" 
                tick={{ fontSize: 9 }}
              />
              <YAxis
                dataKey="attendancePercentage"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                allowDecimals={false}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 10 }}
                label={{ value: 'Asistencia (%)', angle: -90, position: 'insideLeft', offset: 10, style: {fontSize: '10px', fill: 'hsl(var(--muted-foreground))'} }}
              />
              <Tooltip
                cursor={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyChartDataPoint;
                    return (
                      <ChartTooltipContent
                        className="w-[220px]"
                        label={data.monthDisplay}
                        payload={[{
                            name: "Asistencia",
                            value: `${data.attendancePercentage.toFixed(0)}% (${data.attendedCount}/${data.convocatedCount} inst.)`,
                            color: "hsl(var(--primary))"
                        }]}
                        indicator="line"
                      />
                    );
                  }
                  return null;
                }}
              />
              <Line
                dataKey="attendancePercentage"
                type="linear"
                stroke="var(--color-attendancePercentage)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attendancePercentage)",
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
                name="Porcentaje de Asistencia"
                connectNulls={true} 
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay datos de asistencia para mostrar el gráfico con los filtros actuales.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

