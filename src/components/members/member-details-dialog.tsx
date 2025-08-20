"use client";

import type { Member, GDI, MinistryArea, AddMemberFormValues, MemberRoleType, Meeting, MeetingSeries, AttendanceRecord, TitheRecord } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, ShieldCheck, BarChart3, ListChecks, LineChart, Filter as FilterIcon, Printer, BookOpenCheck } from 'lucide-react'; // Added Printer, BookOpenCheck
import AddMemberForm from './add-member-form';
import MemberAttendanceSummary from './member-attendance-chart';
import MemberAttendanceLineChart from './member-attendance-line-chart';
import MemberTitheHistory from './member-tithe-history'; // New import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import React, { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { startOfYear, endOfDay } from 'date-fns';

interface MemberDetailsDialogProps {
  member: Member | null;
  allMembers: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
  allTitheRecords: TitheRecord[];
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated: (updatedMember: Member) => void;
  updateMemberAction: (memberData: Member) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
}

const roleDisplayNames: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};


export default function MemberDetailsDialog({
  member,
  allMembers,
  allGDIs,
  allMinistryAreas,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
  allTitheRecords,
  isOpen,
  onClose,
  onMemberUpdated,
  updateMemberAction
}: MemberDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

  const [attendanceSelectedSeriesId, setAttendanceSelectedSeriesId] = useState<string>('all');
  const [attendanceStartDate, setAttendanceStartDate] = useState<Date | undefined>(undefined);
  const [attendanceEndDate, setAttendanceEndDate] = useState<Date | undefined>(undefined);

  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAttendanceSelectedSeriesId('all');
      const now = new Date();
      setAttendanceStartDate(startOfYear(now));
      setAttendanceEndDate(endOfDay(now));
    }
  }, [isOpen, member]);


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00Z');
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    } catch (e) {
      return dateString;
    }
  };

  const memberGDIInfo = useMemo(() => {
    if (!member || !member.assignedGDIId) return { gdiName: 'No asignado', guideName: 'N/A' };
    const gdi = allGDIs.find(g => g.id === member.assignedGDIId);
    if (!gdi) return { gdiName: 'GDI no encontrado', guideName: 'N/A' };
    const guide = allMembers.find(m => m.id === gdi.guideId);
    return {
      gdiName: gdi.name,
      guideName: guide ? `${guide.firstName} ${guide.lastName}` : 'Guía no encontrado'
    };
  }, [member, allGDIs, allMembers]);

  const memberAreaNames = useMemo(() => {
    if (!member || !member.assignedAreaIds || member.assignedAreaIds.length === 0) return ['Ninguna'];
    return member.assignedAreaIds
      .map(areaId => allMinistryAreas.find(area => area.id === areaId)?.name)
      .filter(Boolean) as string[];
  }, [member, allMinistryAreas]);

  const baptismDate = member?.baptismDate || 'N/A';

  const displayStatus = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Inactive': return 'Inactivo';
      case 'New': return 'Nuevo';
      default: return status;
    }
  };

  const relevantSeriesForAttendanceDropdown = useMemo(() => {
    if (!member) return [];

    const relevantSeriesIds = new Set<string>();

    allMeetings.forEach(meeting => {
      if (meeting.attendeeUids && meeting.attendeeUids.includes(member.id)) {
        relevantSeriesIds.add(meeting.seriesId);
      }
    });

    allMeetingSeries.forEach(series => {
      if (series.seriesType === 'general' && series.targetAttendeeGroups.includes('allMembers')) {
        relevantSeriesIds.add(series.id);
      }
    });

    return allMeetingSeries
      .filter(series => relevantSeriesIds.has(series.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allMeetings, allMeetingSeries, member]);

  const expectedAttendeesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    allMeetings.forEach(meeting => {
      map[meeting.id] = new Set(meeting.attendeeUids || []);
    });
    return map;
  }, [allMeetings]);


  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
        setActiveTab("details");
    }
  };

  const handleFormSubmit = async (data: AddMemberFormValues, memberId?: string) => {
    if (!memberId || !member) return;

    const updatedMemberData: Member = {
      ...member,
      ...data,
      birthDate: data.birthDate ? data.birthDate.toISOString().split('T')[0] : undefined,
      churchJoinDate: data.churchJoinDate ? data.churchJoinDate.toISOString().split('T')[0] : undefined,
      id: memberId,
    };

    startTransition(async () => {
      const result = await updateMemberAction(updatedMemberData);
      if (result.success && result.updatedMember) {
        toast({
          title: "Éxito",
          description: result.message,
        });
        onMemberUpdated(result.updatedMember);
        setIsEditing(false);
        setActiveTab("details");
        onClose();
      } else {
        toast({
          title: "Error al Actualizar",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleCloseDialog = () => {
    setIsEditing(false);
    setActiveTab("details");
    onClose();
  };

  const handlePrintAttendance = () => {
    const dialogContentElem = dialogContentRef.current;
    if (!dialogContentElem) return;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // Prevent body scroll during print

    dialogContentElem.classList.add('is-printing-member-attendance');
    
    const afterPrintHandler = () => {
      dialogContentElem.classList.remove('is-printing-member-attendance');
      document.body.style.overflow = originalBodyOverflow;
      window.removeEventListener('afterprint', afterPrintHandler);
    };

    window.addEventListener('afterprint', afterPrintHandler);
    window.print();

    // Fallback for browsers that might not fire 'afterprint' reliably when print is cancelled
    setTimeout(() => {
      if (dialogContentElem.classList.contains('is-printing-member-attendance')) {
        afterPrintHandler();
      }
    }, 1000);
  };


  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent 
        ref={dialogContentRef}
        className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0"
      >
        <DialogHeader className="p-6 border-b no-print">
           <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
              <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl sm:text-2xl">{member.firstName} {member.lastName}</DialogTitle>
                <div className="mt-1 flex flex-wrap gap-1 items-center">
                    <Badge variant={
                        member.status === 'Active' ? 'default' :
                        member.status === 'Inactive' ? 'secondary' :
                        'outline'
                    }
                    className={
                        member.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/50' :
                        member.status === 'Inactive' ? 'bg-red-500/20 text-red-700 border-red-500/50' :
                        'bg-yellow-500/20 text-yellow-700 border-yellow-500/50'
                    }
                    >
                    {displayStatus(member.status)}
                    </Badge>
                    {member.roles && member.roles.length > 0 && member.roles.map(role => (
                       <Badge key={role} variant="outline" className="text-xs border-primary/50 text-primary/90">
                         <ShieldCheck className="mr-1 h-3 w-3" />{roleDisplayNames[role] || role}
                       </Badge>
                    ))}
                </div>
            </div>
          </div>
          {isEditing && <DialogDescription className="pt-2">Modifique los campos necesarios y guarde los cambios.</DialogDescription>}
        </DialogHeader>

        {isEditing ? (
          <div className="flex-grow overflow-y-auto min-h-0">
            <AddMemberForm
              initialMemberData={member}
              onSubmitMember={handleFormSubmit}
              allGDIs={allGDIs}
              allMinistryAreas={allMinistryAreas}
              allMembers={allMembers}
              submitButtonText="Guardar Cambios"
              cancelButtonText="Cancelar Edición"
              onDialogClose={handleEditToggle}
              isSubmitting={isPending}
            />
          </div>
        ) : (
        <div className="flex-grow flex flex-col min-h-0 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                <TabsList className="mx-6 mt-4 flex-shrink-0 no-print">
                    <TabsTrigger value="details" className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Detalles
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <BookOpenCheck className="h-4 w-4" /> Historial
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="p-6">
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Email:</span>
                        <span className="col-span-2 break-all">{member.email}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Teléfono:</span>
                        <span className="col-span-2">{member.phone}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Fecha de Nacimiento:</span>
                        <span className="col-span-2">{formatDate(member.birthDate)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Ingreso a la Iglesia:</span>
                        <span className="col-span-2">{formatDate(member.churchJoinDate)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Bautismo:</span>
                        <span className="col-span-2">{baptismDate}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Escuela de Vida:</span>
                        <span className="col-span-2">{member.attendsLifeSchool ? 'Sí' : 'No'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Instituto Bíblico (IBE):</span>
                        <span className="col-span-2">{member.attendsBibleInstitute ? 'Sí' : 'No'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Vino de otra Iglesia:</span>
                        <span className="col-span-2">{member.fromAnotherChurch ? 'Sí' : 'No'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">GDI:</span>
                        <span className="col-span-2">
                          {memberGDIInfo.gdiName}
                          {member.assignedGDIId && ` (Guía: ${memberGDIInfo.guideName})`}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold text-muted-foreground">Áreas de Ministerio:</span>
                        <span className="col-span-2">
                          {memberAreaNames.join(', ')}
                        </span>
                      </div>
                    </div>
                </TabsContent>
                <TabsContent value="history" className="p-6 space-y-6" id="attendance-print-section-wrapper">
                    <div id="attendance-print-section">
                        <div className="bg-muted/50 p-4 rounded-lg shadow-sm no-print">
                          <div className="flex flex-col sm:flex-row justify-between items-center mb-3">
                            <h3 className="text-md font-semibold text-primary flex items-center">
                                <FilterIcon className="mr-2 h-4 w-4" /> Filtrar Historial
                            </h3>
                            <Button onClick={handlePrintAttendance} variant="outline" size="sm">
                                <Printer className="mr-2 h-4 w-4" /> Imprimir Historial
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="attendanceSeriesFilter" className="text-xs font-medium">Serie de Reunión:</Label>
                              <Select value={attendanceSelectedSeriesId} onValueChange={setAttendanceSelectedSeriesId}>
                                <SelectTrigger id="attendanceSeriesFilter" className="mt-1 h-9">
                                  <SelectValue placeholder="Seleccionar serie..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas las Series Relevantes</SelectItem>
                                  {relevantSeriesForAttendanceDropdown.map(series => (
                                    <SelectItem key={series.id} value={series.id}>
                                      {series.name}
                                    </SelectItem>
                                  ))}
                                   {relevantSeriesForAttendanceDropdown.length === 0 && (
                                    <SelectItem value="no-relevant-series" disabled>
                                      No hay series relevantes
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="attendanceStartDateFilter" className="text-xs font-medium">Fecha de Inicio:</Label>
                              <DatePicker date={attendanceStartDate} setDate={setAttendanceStartDate} placeholder="Desde" />
                            </div>
                            <div>
                              <Label htmlFor="attendanceEndDateFilter" className="text-xs font-medium">Fecha de Fin:</Label>
                              <DatePicker date={attendanceEndDate} setDate={setAttendanceEndDate} placeholder="Hasta" />
                            </div>
                          </div>
                           {(attendanceStartDate || attendanceEndDate) && (
                              <Button
                                onClick={() => {
                                  const now = new Date();
                                  setAttendanceStartDate(startOfYear(now));
                                  setAttendanceEndDate(endOfDay(now));
                                }}
                                variant="link"
                                size="sm"
                                className="px-0 text-xs h-auto mt-2 text-primary hover:text-primary/80"
                              >
                                <FilterIcon className="mr-1 h-3 w-3"/> Limpiar filtro de fechas
                              </Button>
                            )}
                        </div>

                        <MemberAttendanceLineChart
                            memberId={member.id}
                            memberName={`${member.firstName} ${member.lastName}`}
                            allMeetings={allMeetings}
                            allMeetingSeries={allMeetingSeries}
                            allAttendanceRecords={allAttendanceRecords}
                            selectedSeriesId={attendanceSelectedSeriesId}
                            startDate={attendanceStartDate}
                            endDate={attendanceEndDate}
                            expectedAttendeesMap={expectedAttendeesMap}
                        />
                        <MemberAttendanceSummary
                            memberId={member.id}
                            memberName={`${member.firstName} ${member.lastName}`}
                            allMeetings={allMeetings}
                            allMeetingSeries={allMeetingSeries}
                            allAttendanceRecords={allAttendanceRecords}
                            selectedSeriesId={attendanceSelectedSeriesId}
                            startDate={attendanceStartDate}
                            endDate={attendanceEndDate}
                        />
                        <MemberTitheHistory
                            memberId={member.id}
                            allTitheRecords={allTitheRecords}
                            startDate={attendanceStartDate}
                            endDate={attendanceEndDate}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
        )}

        {!isEditing && (
          <DialogFooter className="p-6 border-t no-print">
            <Button onClick={handleEditToggle} variant="default">
              <Pencil className="mr-2 h-4 w-4" />
              Editar Miembro
            </Button>
            <Button onClick={handleCloseDialog} variant="outline">Cerrar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
