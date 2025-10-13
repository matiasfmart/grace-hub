import { z } from 'zod';
import { ObjectId } from 'mongodb';

// ============================================
// MONGODB DOCUMENT TYPES (Internal/Database)
// ============================================

export const MemberRoleEnum = z.enum(['Leader', 'Worker', 'GeneralAttendee']);
export type MemberRoleType = z.infer<typeof MemberRoleEnum>;

/**
 * MongoDB document structure for Members
 * Uses ObjectId for references for better performance and data integrity
 */
export interface MemberDocument {
  _id?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string; // YYYY-MM-DD
  churchJoinDate?: string; // YYYY-MM-DD
  baptismDate?: string; // User input, e.g., "June 2023" or "2023-06-15"
  attendsLifeSchool?: boolean;
  attendsBibleInstitute?: boolean;
  fromAnotherChurch?: boolean;
  assignedGDIId?: ObjectId | null; // ObjectId reference to GDI
  assignedAreaIds?: ObjectId[]; // Array of ObjectId references to MinistryAreas
  status: 'Active' | 'Inactive' | 'New';
  avatarUrl?: string;
  roles?: MemberRoleType[];
}

export interface GDIDocument {
  _id?: ObjectId;
  name: string;
  guideId: ObjectId; // ObjectId reference to Member
  memberIds: ObjectId[]; // Array of ObjectId references to Members
}

export interface MinistryAreaDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  leaderId: ObjectId; // ObjectId reference to Member
  memberIds: ObjectId[]; // Array of ObjectId references to Members
}

export const MeetingTargetRoleEnum = z.enum(["allMembers", "workers", "leaders"]);
export type MeetingTargetRoleType = z.infer<typeof MeetingTargetRoleEnum>;

export const DayOfWeekEnum = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
export type DayOfWeekType = z.infer<typeof DayOfWeekEnum>;

export const WeekOrdinalEnum = z.enum(['First', 'Second', 'Third', 'Fourth', 'Last']);
export type WeekOrdinalType = z.infer<typeof WeekOrdinalEnum>;

export const MonthlyRuleTypeEnum = z.enum(['DayOfMonth', 'DayOfWeekOfMonth']);
export type MonthlyRuleType = z.infer<typeof MonthlyRuleTypeEnum>;

export const MeetingFrequencyEnum = z.enum(["OneTime", "Weekly", "Monthly"]);
export type MeetingFrequencyType = z.infer<typeof MeetingFrequencyEnum>;

export const MeetingSeriesTypeEnum = z.enum(['general', 'gdi', 'ministryArea']);
export type MeetingSeriesType = z.infer<typeof MeetingSeriesTypeEnum>;

export interface MeetingSeriesDocument {
  _id?: ObjectId;
  name: string;
  description?: string;
  defaultTime: string; // HH:MM
  defaultLocation: string;
  seriesType: MeetingSeriesType;
  ownerGroupId?: ObjectId | null; // ObjectId of GDI or MinistryArea if seriesType is 'gdi' or 'ministryArea'
  targetAttendeeGroups: MeetingTargetRoleType[]; // For 'general' series
  frequency: MeetingFrequencyType;
  oneTimeDate?: string; // YYYY-MM-DD, only if frequency is "OneTime"
  cancelledDates?: string[]; // YYYY-MM-DD, dates of recurring instances explicitly cancelled
  // Weekly recurrence
  weeklyDays?: DayOfWeekType[];
  // Monthly recurrence
  monthlyRuleType?: MonthlyRuleType;
  monthlyDayOfMonth?: number; // 1-31
  monthlyWeekOrdinal?: WeekOrdinalType;
  monthlyDayOfWeek?: DayOfWeekType;
}

export interface MeetingDocument {
  _id?: ObjectId;
  seriesId: ObjectId; // ObjectId reference to MeetingSeries
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description?: string;
  attendeeUids: ObjectId[]; // Array of ObjectId references to Members
  minute?: string | null;
}

export interface AttendanceRecordDocument {
  _id?: ObjectId;
  meetingId: ObjectId; // ObjectId reference to Meeting
  memberId: ObjectId; // ObjectId reference to Member
  attended: boolean;
  notes?: string;
}

export interface TitheRecordDocument {
  _id?: ObjectId;
  memberId: ObjectId; // ObjectId reference to Member
  year: number; // e.g., 2024
  month: number; // 1-12
}

// ============================================
// CLIENT TYPES (API/UI)
// ============================================
// These are serialized versions sent to the client
// ObjectIds are converted to strings

export interface Member {
  id: string; // Serialized from _id
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  churchJoinDate?: string;
  baptismDate?: string;
  attendsLifeSchool?: boolean;
  attendsBibleInstitute?: boolean;
  fromAnotherChurch?: boolean;
  assignedGDIId?: string | null;
  assignedAreaIds?: string[];
  status: 'Active' | 'Inactive' | 'New';
  avatarUrl?: string;
  roles?: MemberRoleType[];
}

export interface GDI {
  id: string;
  name: string;
  guideId: string;
  memberIds: string[];
}

export interface MinistryArea {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberIds: string[];
}

export interface MeetingSeries {
  id: string;
  name: string;
  description?: string;
  defaultTime: string;
  defaultLocation: string;
  seriesType: MeetingSeriesType;
  ownerGroupId?: string | null;
  targetAttendeeGroups: MeetingTargetRoleType[];
  frequency: MeetingFrequencyType;
  oneTimeDate?: string;
  cancelledDates?: string[];
  weeklyDays?: DayOfWeekType[];
  monthlyRuleType?: MonthlyRuleType;
  monthlyDayOfMonth?: number;
  monthlyWeekOrdinal?: WeekOrdinalType;
  monthlyDayOfWeek?: DayOfWeekType;
}

export interface Meeting {
  id: string;
  seriesId: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  attendeeUids: string[];
  minute?: string | null;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  attended: boolean;
  notes?: string;
}

export interface TitheRecord {
  id: string;
  memberId: string;
  year: number;
  month: number;
}

// ============================================
// WRITE DATA TYPES (for inserts)
// ============================================

export type MemberWriteData = Omit<Member, 'id'>;
export type GDIWriteData = Omit<GDI, 'id'>;
export type MinistryAreaWriteData = Omit<MinistryArea, 'id'>;
export type MeetingSeriesWriteData = Omit<MeetingSeries, 'id'>;
export type MeetingWriteData = Omit<Meeting, 'id' | 'attendeeUids'> & { attendeeUids?: string[] };
export type AttendanceRecordWriteData = Omit<AttendanceRecord, 'id'>;
export type TitheRecordWriteData = Omit<TitheRecord, 'id'>;

// ============================================
// UPDATE DATA TYPES
// ============================================

export type MeetingInstanceUpdateData = Partial<Omit<Meeting, 'id' | 'seriesId' | 'attendeeUids'>>;
export type AnyMeetingInstanceUpdateData = Partial<Omit<Meeting, 'id' | 'seriesId' | 'attendeeUids'>>;

// ============================================
// ZOD SCHEMAS FOR FORM VALIDATION
// ============================================

export const MemberStatusSchema = z.enum(['Active', 'Inactive', 'New']);
export const NONE_GDI_OPTION_VALUE = "__NONE__"; // Used in member form for "Ninguno" GDI
export const NO_ROLE_FILTER_VALUE = "no-role-assigned";
export const NO_GDI_FILTER_VALUE = "no-gdi-assigned";
export const NO_AREA_FILTER_VALUE = "no-area-assigned";

export const AddMemberFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de email inválida." }).optional().or(z.literal('')),
  phone: z.string().min(7, { message: "El número de teléfono parece demasiado corto." }),
  birthDate: z.date().optional(),
  churchJoinDate: z.date().optional(),
  baptismDate: z.string().optional(),
  attendsLifeSchool: z.boolean().default(false),
  attendsBibleInstitute: z.boolean().default(false),
  fromAnotherChurch: z.boolean().default(false),
  status: MemberStatusSchema,
  avatarUrl: z.string().url({ message: "URL inválida." }).optional().or(z.literal('')),
  assignedGDIId: z.string().nullable().optional(),
  assignedAreaIds: z.array(z.string()).optional(),
});
export type AddMemberFormValues = z.infer<typeof AddMemberFormSchema>;

export const AddMinistryAreaFormSchema = z.object({
  name: z.string().min(3, { message: "Area name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  leaderId: z.string().min(1, { message: "A leader must be selected." }),
});
export type AddMinistryAreaFormValues = z.infer<typeof AddMinistryAreaFormSchema>;

export const AddGdiFormSchema = z.object({
  name: z.string().min(3, { message: "GDI name must be at least 3 characters." }),
  guideId: z.string().min(1, { message: "A guide must be selected." }),
});
export type AddGdiFormValues = z.infer<typeof AddGdiFormSchema>;

export const DefineMeetingSeriesFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la serie debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
  defaultTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  defaultLocation: z.string().min(3, { message: "La ubicación por defecto es requerida." }),
  seriesType: MeetingSeriesTypeEnum.default('general'), // Contextually set
  ownerGroupId: z.string().nullable().optional(), // Contextually set
  targetAttendeeGroups: z.array(MeetingTargetRoleEnum).min(1,{message: "Debe seleccionar al menos un grupo de asistentes."}),
  frequency: MeetingFrequencyEnum,
  oneTimeDate: z.date().optional(),
  weeklyDays: z.array(DayOfWeekEnum).optional(),
  monthlyRuleType: MonthlyRuleTypeEnum.optional(),
  monthlyDayOfMonth: z.coerce.number().min(1).max(31).optional(),
  monthlyWeekOrdinal: WeekOrdinalEnum.optional(),
  monthlyDayOfWeek: DayOfWeekEnum.optional(),
  cancelledDates: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.frequency === "OneTime") {
    if (!data.oneTimeDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha es requerida para reuniones de 'Única Vez'.",
        path: ["oneTimeDate"],
      });
    }
  }
  if (data.frequency === 'Weekly') {
    if (!data.weeklyDays || data.weeklyDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar al menos un día para la frecuencia semanal.",
        path: ['weeklyDays'],
      });
    }
  }
  if (data.frequency === 'Monthly') {
    if (!data.monthlyRuleType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar un tipo de regla mensual.", path: ['monthlyRuleType'] });
    } else if (data.monthlyRuleType === 'DayOfMonth') {
      if (data.monthlyDayOfMonth === undefined || data.monthlyDayOfMonth < 1 || data.monthlyDayOfMonth > 31) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El día del mes debe estar entre 1 y 31.", path: ['monthlyDayOfMonth'] });
      }
    } else if (data.monthlyRuleType === 'DayOfWeekOfMonth') {
      if (!data.monthlyWeekOrdinal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar la semana ordinal (ej. Primera, Última).", path: ['monthlyWeekOrdinal'] });
      }
      if (!data.monthlyDayOfWeek) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar el día de la semana (ej. Lunes, Martes).", path: ['monthlyDayOfWeek'] });
      }
    }
  }
  if (data.seriesType === 'general' && (!data.targetAttendeeGroups || data.targetAttendeeGroups.length === 0)) {
     ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar al menos un grupo de asistentes para series generales.",
        path: ['targetAttendeeGroups'],
      });
  }
});
export type DefineMeetingSeriesFormValues = z.infer<typeof DefineMeetingSeriesFormSchema>;

export const MeetingInstanceFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la reunión debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es requerida." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  location: z.string().min(3, { message: "La ubicación es requerida." }),
  description: z.string().optional(),
});
export type MeetingInstanceFormValues = z.infer<typeof MeetingInstanceFormSchema>;

export const daysOfWeek: { id: DayOfWeekType; label: string }[] = [
    { id: "Sunday", label: "Domingo" },
    { id: "Monday", label: "Lunes" },
    { id: "Tuesday", label: "Martes" },
    { id: "Wednesday", label: "Miércoles" },
    { id: "Thursday", label: "Jueves" },
    { id: "Friday", label: "Viernes" },
    { id: "Saturday", label: "Sábado" },
];

export const weekOrdinals: { id: WeekOrdinalType; label: string }[] = [
    { id: "First", label: "Primera" },
    { id: "Second", label: "Segunda" },
    { id: "Third", label: "Tercera" },
    { id: "Fourth", label: "Cuarta" },
    { id: "Last", label: "Última" },
];

export type AddOccasionalMeetingFormValues = MeetingInstanceFormValues;
export const AddOccasionalMeetingFormSchema = MeetingInstanceFormSchema;

// ============================================
// DISCRIMINATED UNION TYPES (for type safety)
// ============================================

interface MeetingBase {
  id: string;
  seriesId: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description?: string;
  attendeeUids: string[];
  minute?: string | null;
}

export interface GeneralMeeting extends MeetingBase {
  seriesType: 'general';
  ownerGroupId?: null;
}

export interface GdiMeeting extends MeetingBase {
  seriesType: 'gdi';
  ownerGroupId: string; // GDI ID
}

export interface MinistryAreaMeeting extends MeetingBase {
  seriesType: 'ministryArea';
  ownerGroupId: string; // MinistryArea ID
}

export type AnyMeeting = GeneralMeeting | GdiMeeting | MinistryAreaMeeting;
export type AnyMeetingWriteData = Omit<AnyMeeting, 'id' | 'attendeeUids'> & { attendeeUids?: string[] };

// ============================================
// PAGE PROPS TYPE
// ============================================

export interface PageProps {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}
