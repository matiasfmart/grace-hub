"use client";

import { CheckCircle, Loader2, Search, Users, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { AttendanceRecord, Member } from "@/lib/types";

interface AttendanceManagerViewProps {
	meetingId: string;
	initialAttendees: Member[];
	initialAttendanceRecords: AttendanceRecord[];
	saveAttendanceAction: (
		meetingId: string,
		memberAttendances: Array<{ memberId: string; attended: boolean }>,
	) => Promise<{ success: boolean; message: string }>;
}

interface AttendeeState extends Member {
	attended: boolean;
}

export default function AttendanceManagerView({
	meetingId,
	initialAttendees,
	initialAttendanceRecords,
	saveAttendanceAction,
}: AttendanceManagerViewProps) {
	const [attendees, setAttendees] = useState<AttendeeState[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [isPending, startTransition] = useTransition();
	const { toast } = useToast();

	useEffect(() => {
		if (Array.isArray(initialAttendees)) {
			const mergedAttendees = initialAttendees.map((member) => {
				const record = initialAttendanceRecords.find(
					(r) => r.memberId === member.id,
				);
				return { ...member, attended: record ? record.attended : false };
			});
			setAttendees(mergedAttendees);
		} else {
			// Fallback if initialAttendees is not an array
			setAttendees([]);
			// console.warn("AttendanceManagerView: initialAttendees was not an array.", initialAttendees);
		}
	}, [initialAttendees, initialAttendanceRecords]);

	const handleAttendanceChange = (memberId: string, isChecked: boolean) => {
		setAttendees((prev) =>
			prev.map((att) =>
				att.id === memberId ? { ...att, attended: isChecked } : att,
			),
		);
	};

	const handleMarkAll = (markAsAttended: boolean) => {
		setAttendees((prev) =>
			prev.map((att) => ({ ...att, attended: markAsAttended })),
		);
	};

	const handleSubmit = () => {
		startTransition(async () => {
			const attendanceData = attendees.map((att) => ({
				memberId: att.id,
				attended: att.attended,
			}));
			const result = await saveAttendanceAction(meetingId, attendanceData);
			if (result.success) {
				toast({ title: "Éxito", description: result.message });
			} else {
				toast({
					title: "Error",
					description: result.message,
					variant: "destructive",
				});
			}
		});
	};

	const filteredAttendees = attendees.filter(
		(att) =>
			`${att.firstName} ${att.lastName}`
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			att.email.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const attendedCount = attendees.filter((att) => att.attended).length;
	const totalResolved = attendees.length;

	return (
		<Card className="shadow-lg">
			<CardHeader>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<CardTitle className="font-headline text-2xl text-primary flex items-center">
							<Users className="mr-2 h-6 w-6" /> Registrar Asistencia
						</CardTitle>
						<CardDescription>
							Marque los miembros presentes. Hay {totalResolved} miembros
							esperados. ({attendedCount} de {totalResolved} marcados como
							presentes)
						</CardDescription>
					</div>
					<div className="flex gap-2 flex-wrap">
						<Button
							onClick={() => handleMarkAll(true)}
							variant="outline"
							size="sm"
							disabled={isPending}
						>
							<CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Marcar
							Todos
						</Button>
						<Button
							onClick={() => handleMarkAll(false)}
							variant="outline"
							size="sm"
							disabled={isPending}
						>
							<XCircle className="mr-2 h-4 w-4 text-red-500" /> Desmarcar Todos
						</Button>
					</div>
				</div>
				<div className="mt-4 relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar miembros en la lista..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10"
						disabled={isPending}
					/>
				</div>
			</CardHeader>
			<CardContent>
				<ScrollArea className="h-[400px] w-full pr-3">
					{filteredAttendees.length > 0 ? (
						<div className="space-y-3">
							{filteredAttendees.map((attendee) => (
								<div
									key={attendee.id}
									className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
								>
									<Checkbox
										id={`att-${attendee.id}`}
										checked={attendee.attended}
										onCheckedChange={(checked) =>
											handleAttendanceChange(attendee.id, Boolean(checked))
										}
										disabled={isPending}
										className="h-5 w-5"
									/>
									<Avatar className="h-9 w-9">
										<AvatarFallback>
											{attendee.firstName.charAt(0)}
											{attendee.lastName.charAt(0)}
										</AvatarFallback>
									</Avatar>
									<Label
										htmlFor={`att-${attendee.id}`}
										className="flex-grow cursor-pointer text-sm"
									>
										<span className="font-medium">
											{attendee.firstName} {attendee.lastName}
										</span>
										<span className="block text-xs text-muted-foreground">
											{attendee.email}
										</span>
									</Label>
								</div>
							))}
						</div>
					) : (
						<p className="text-center text-muted-foreground py-4">
							{searchTerm
								? "No hay miembros que coincidan con la búsqueda."
								: "No hay miembros para mostrar."}
						</p>
					)}
				</ScrollArea>
				<div className="mt-6 flex justify-end">
					<Button
						onClick={handleSubmit}
						disabled={
							isPending ||
							initialAttendees === null ||
							initialAttendees === undefined ||
							initialAttendees.length === 0
						}
					>
						{isPending ? <Loader2 className="animate-spin mr-2" /> : null}
						{isPending ? "Guardando..." : "Guardar Asistencia"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
