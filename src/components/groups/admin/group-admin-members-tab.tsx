"use client";

import { MoreHorizontal, UserMinus, UserPlus, ExternalLink, Search, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Member } from "@/lib/types";

interface GroupAdminMembersTabProps {
	groupType: "gdi" | "area";
	leaderId: string;
	leaderLabel: string; // "Guía" or "Líder"
	mentorId?: string;
	memberIds: string[];
	allMembers: Member[];
	activeMembers: Member[];
	onAddMembers: (memberIds: string[]) => void;
	onRemoveMember: (memberId: string) => void;
	isUpdating: boolean;
}

const statusDisplayMap: Record<Member["status"], string> = {
	vigente: "Vigente",
	eliminado: "Eliminado",
};

const statusColorMap: Record<string, string> = {
	Active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	Inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
	New: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	vigente: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	eliminado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function GroupAdminMembersTab({
	groupType,
	leaderId,
	leaderLabel,
	mentorId,
	memberIds,
	allMembers,
	activeMembers,
	onAddMembers,
	onRemoveMember,
	isUpdating,
}: GroupAdminMembersTabProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
	const [addSearchTerm, setAddSearchTerm] = useState("");

	// Current members (including leader)
	const currentMembers = useMemo(() => {
		const allIds = new Set([leaderId, ...memberIds]);
		return allMembers
			.filter(m => allIds.has(m.id))
			.filter(m => 
				`${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
				m.email?.toLowerCase().includes(searchTerm.toLowerCase())
			)
			.sort((a, b) => {
				// Leader first
				if (a.id === leaderId) return -1;
				if (b.id === leaderId) return 1;
				// Mentor second
				if (a.id === mentorId) return -1;
				if (b.id === mentorId) return 1;
				// Then alphabetically
				return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
			});
	}, [leaderId, memberIds, allMembers, searchTerm, mentorId]);

	// Available members to add
	const availableMembers = useMemo(() => {
		const currentIds = new Set([leaderId, ...memberIds]);
		return activeMembers
			.filter(m => !currentIds.has(m.id))
			.filter(m =>
				`${m.firstName} ${m.lastName}`.toLowerCase().includes(addSearchTerm.toLowerCase()) ||
				m.email?.toLowerCase().includes(addSearchTerm.toLowerCase())
			)
			.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
	}, [leaderId, memberIds, activeMembers, addSearchTerm]);

	const handleAddSelected = () => {
		if (selectedToAdd.length > 0) {
			onAddMembers(selectedToAdd);
			setSelectedToAdd([]);
			setIsAddDialogOpen(false);
			setAddSearchTerm("");
		}
	};

	const toggleSelectToAdd = (memberId: string) => {
		setSelectedToAdd(prev =>
			prev.includes(memberId)
				? prev.filter(id => id !== memberId)
				: [...prev, memberId]
		);
	};

	const getMemberRole = (memberId: string): string | null => {
		if (memberId === leaderId) return leaderLabel;
		if (memberId === mentorId) return "Mentor";
		return null;
	};

	return (
		<div className="space-y-4">
			{/* Header with search and add button */}
			<div className="flex flex-col sm:flex-row gap-3 justify-between">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar miembros..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<UserPlus className="mr-2 h-4 w-4" />
							Agregar Miembros
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Agregar Miembros</DialogTitle>
							<DialogDescription>
								Seleccione los miembros que desea agregar al grupo.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Buscar miembros disponibles..."
									value={addSearchTerm}
									onChange={(e) => setAddSearchTerm(e.target.value)}
									className="pl-9"
								/>
							</div>
							<ScrollArea className="h-64 rounded-md border p-2">
								{availableMembers.length > 0 ? (
									availableMembers.map(member => (
										<div
											key={member.id}
											className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
											onClick={() => toggleSelectToAdd(member.id)}
										>
											<Checkbox
												id={`add-${member.id}`}
												checked={selectedToAdd.includes(member.id)}
												onCheckedChange={() => toggleSelectToAdd(member.id)}
											/>
											<Label
												htmlFor={`add-${member.id}`}
												className="flex-1 cursor-pointer text-sm"
											>
												{member.firstName} {member.lastName}
											</Label>
											<Badge variant="outline" className="text-xs">
												{statusDisplayMap[member.status] || member.status}
											</Badge>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground text-center py-8">
										{addSearchTerm
											? "No se encontraron miembros"
											: "No hay miembros disponibles para agregar"}
									</p>
								)}
							</ScrollArea>
							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setIsAddDialogOpen(false);
										setSelectedToAdd([]);
										setAddSearchTerm("");
									}}
								>
									Cancelar
								</Button>
								<Button
									onClick={handleAddSelected}
									disabled={selectedToAdd.length === 0 || isUpdating}
								>
									Agregar ({selectedToAdd.length})
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Members list */}
			<div className="rounded-xl border-2 border-border/60 shadow-lg bg-card overflow-hidden">
				{currentMembers.length > 0 ? (
					<div className="divide-y divide-border/40">
						{currentMembers.map((member, idx) => {
							const role = getMemberRole(member.id);
							const isLeader = member.id === leaderId;
							const isMentor = member.id === mentorId;

							return (
								<div
									key={member.id}
									className={`flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
										idx % 2 === 1 ? "bg-muted/20" : ""
									} ${isLeader ? "bg-primary/5" : ""}`}
								>
									<div className="flex items-center gap-3">
										<div className={`h-9 w-9 rounded-full flex items-center justify-center ${
										isLeader ? "bg-primary/20" : isMentor ? "bg-blue-100 dark:bg-blue-900/30" : "bg-primary/10"
									}`}>
										<span className={`text-sm font-medium ${
											isLeader ? "text-primary" : isMentor ? "text-blue-600 dark:text-blue-400" : "text-primary"
											}`}>
												{member.firstName[0]}{member.lastName[0]}
											</span>
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium">
													{member.firstName} {member.lastName}
												</span>
												{role && (
													<Badge variant="secondary" className="text-xs">
														{role === leaderLabel && <UserCheck className="h-3 w-3 mr-1" />}
														{role}
													</Badge>
												)}
											</div>
											{member.email && (
												<p className="text-xs text-muted-foreground">{member.email}</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge 
											variant="outline" 
											className={`text-xs ${statusColorMap[member.status] || ""}`}
										>
											{statusDisplayMap[member.status] || member.status}
										</Badge>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<MoreHorizontal className="h-4 w-4" />
													<span className="sr-only">Acciones</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem asChild>
													<a href={`/members?search=${encodeURIComponent(`${member.firstName} ${member.lastName}`)}`}>
														<ExternalLink className="mr-2 h-4 w-4" />
														Ver perfil
													</a>
												</DropdownMenuItem>
												{!isLeader && !isMentor && (
													<>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onClick={() => onRemoveMember(member.id)}
															disabled={isUpdating}
														>
															<UserMinus className="mr-2 h-4 w-4" />
															Quitar del grupo
														</DropdownMenuItem>
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="p-8 text-center text-muted-foreground">
						{searchTerm
							? "No se encontraron miembros con ese criterio"
							: "No hay miembros en este grupo"}
					</div>
				)}
			</div>

			{/* Summary */}
			<p className="text-sm text-muted-foreground">
				Total: {currentMembers.length} miembros
				{searchTerm && ` (filtrados de ${memberIds.length + 1})`}
			</p>
		</div>
	);
}
