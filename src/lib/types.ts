import { z } from "zod";

// ============================================
// ENUMS AND BASE TYPES
// ============================================

// Member roles aligned with backend
// GdiGuide = Guía de GDI, GdiMentor = Mentor de GDI
// AreaLeader = Líder de Área, AreaMentor = Mentor de Área
// Worker = Obrero
export const MemberRoleEnum = z.enum(["GdiGuide", "GdiMentor", "AreaLeader", "AreaMentor", "Worker"]);
export type MemberRoleType = z.infer<typeof MemberRoleEnum>;

export const MeetingTargetRoleEnum = z.enum([
	"allMembers",
	"workers",
	"leaders",
]);
export type MeetingTargetRoleType = z.infer<typeof MeetingTargetRoleEnum>;

export const DayOfWeekEnum = z.enum([
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
]);
export type DayOfWeekType = z.infer<typeof DayOfWeekEnum>;

export const WeekOrdinalEnum = z.enum([
	"First",
	"Second",
	"Third",
	"Fourth",
	"Last",
]);
export type WeekOrdinalType = z.infer<typeof WeekOrdinalEnum>;

export const MonthlyRuleTypeEnum = z.enum(["DayOfMonth", "DayOfWeekOfMonth"]);
export type MonthlyRuleType = z.infer<typeof MonthlyRuleTypeEnum>;

export const MeetingFrequencyEnum = z.enum(["OneTime", "Weekly", "Monthly"]);
export type MeetingFrequencyType = z.infer<typeof MeetingFrequencyEnum>;

// Legacy type - kept for backwards compatibility
export const MeetingSeriesTypeEnum = z.enum(["general", "gdi", "ministryArea"]);
export type MeetingSeriesType = z.infer<typeof MeetingSeriesTypeEnum>;

// New audience type enum matching backend (see ADR-005)
export const AudienceTypeEnum = z.enum([
	"gdi",
	"area",
	"all_active",
	"integrated",
	"workers",
	"leaders",
	"mentors",
	"by_categories",
]);
export type AudienceType = z.infer<typeof AudienceTypeEnum>;

// Audience config for by_categories type
export interface AudienceConfig {
	roleTypeIds?: number[];
	labels?: string[];
	combineMode?: 'OR' | 'AND';
}

// ============================================
// CLIENT TYPES (API/UI)
// ============================================

// Ecclesiastical label assigned to a member (from role_types table)
export interface EcclesiasticalRole {
	roleTypeId: number;
	name: string;
}

// Note: Dates are kept as strings (YYYY-MM-DD format from API) because
// Next.js cannot serialize Date objects when passing from Server to Client Components.
// Use formatDisplayDate() or formatShortDate() from lib/utils/date.ts to display them.
export interface Member {
	id: string;
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
	status: "vigente" | "eliminado";
	address?: string;
	roles?: MemberRoleType[];
	ecclesiasticalRoles?: EcclesiasticalRole[];
}

export interface GDI {
	id: string;
	name: string;
	guideId: string;
	mentorId?: string;
	memberIds: string[];
}

export interface MinistryArea {
	id: string;
	name: string;
	description: string;
	leaderId: string;
	mentorId: string;
	memberIds: string[];
}

export interface MeetingSeries {
	id: string;
	name: string;
	description?: string;
	defaultTime?: string;
	defaultLocation?: string;
	// New fields matching backend
	audienceType: AudienceType;
	gdiId?: string | null;
	areaId?: string | null;
	meetingTypeId?: string | null;
	audienceConfig?: AudienceConfig | null;
	// Legacy fields - deprecated, use audienceType instead
	seriesType?: MeetingSeriesType;
	ownerGroupId?: string | null;
	targetAttendeeGroups?: MeetingTargetRoleType[];
	// Scheduling fields
	frequency: MeetingFrequencyType;
	startDate: string;
	endDate?: string;
	oneTimeDate?: string;
	cancelledDates?: string[];
	weeklyDays?: DayOfWeekType[];
	monthlyRuleType?: MonthlyRuleType;
	monthlyDayOfMonth?: number;
	monthlyWeekOrdinal?: WeekOrdinalType;
	monthlyDayOfWeek?: DayOfWeekType;
	createdAt?: string;
	updatedAt?: string;
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

export interface ExpectedAttendee {
	memberId: string;
	firstName: string;
	lastName: string;
	fullName: string;
}

// ============================================
// WRITE DATA TYPES (for inserts)
// ============================================

export type MemberWriteData = Omit<Member, "id">;
export type GDIWriteData = Omit<GDI, "id">;
export type MinistryAreaWriteData = Omit<MinistryArea, "id">;
export type MeetingSeriesWriteData = Omit<MeetingSeries, "id">;
export type MeetingWriteData = Omit<Meeting, "id" | "attendeeUids"> & {
	attendeeUids?: string[];
};
export type AttendanceRecordWriteData = Omit<AttendanceRecord, "id">;
export type TitheRecordWriteData = Omit<TitheRecord, "id">;

// ============================================
// UPDATE DATA TYPES
// ============================================

export type MeetingInstanceUpdateData = Partial<
	Omit<Meeting, "id" | "seriesId" | "attendeeUids">
>;
export type AnyMeetingInstanceUpdateData = Partial<
	Omit<Meeting, "id" | "seriesId" | "attendeeUids">
>;

// ============================================
// ZOD SCHEMAS FOR FORM VALIDATION
// ============================================

export const MemberStatusSchema = z.enum(["vigente", "eliminado"]);
export const NONE_GDI_OPTION_VALUE = "__NONE__"; // Used in member form for "Ninguno" GDI
export const NO_ROLE_FILTER_VALUE = "no-role-assigned";
export const NO_GDI_FILTER_VALUE = "no-gdi-assigned";
export const NO_AREA_FILTER_VALUE = "no-area-assigned";

export const AddMemberFormSchema = z.object({
	firstName: z
		.string()
		.min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
	lastName: z
		.string()
		.min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
	email: z
		.string()
		.email({ message: "Dirección de email inválida." })
		.optional()
		.or(z.literal("")),
	phone: z
		.string()
		.min(7, { message: "El número de teléfono parece demasiado corto." }),
	birthDate: z.date().optional(),
	churchJoinDate: z.date().optional(),
	baptismDate: z.date().optional(),
	attendsLifeSchool: z.boolean().default(false),
	attendsBibleInstitute: z.boolean().default(false),
	fromAnotherChurch: z.boolean().default(false),
	status: MemberStatusSchema,
	address: z.string().optional().or(z.literal("")),
	assignedGDIId: z.string().nullable().optional(),
	assignedAreaIds: z.array(z.string()).optional(),
});
export type AddMemberFormValues = z.infer<typeof AddMemberFormSchema>;

export const AddMinistryAreaFormSchema = z.object({
	name: z
		.string()
		.min(3, { message: "Area name must be at least 3 characters." }),
	description: z
		.string()
		.min(10, { message: "Description must be at least 10 characters." }),
	leaderId: z.string().min(1, { message: "A leader must be selected." }),
	mentorId: z.string().optional(),
});
export type AddMinistryAreaFormValues = z.infer<
	typeof AddMinistryAreaFormSchema
>;

export const AddGdiFormSchema = z.object({
	name: z
		.string()
		.min(3, { message: "GDI name must be at least 3 characters." }),
	guideId: z.string().min(1, { message: "A guide must be selected." }),
	mentorId: z.string().optional(),
});
export type AddGdiFormValues = z.infer<typeof AddGdiFormSchema>;

// Schema for audience config when using by_categories
export const AudienceConfigSchema = z.object({
	roleTypeIds: z.array(z.number()).optional(),
	labels: z.array(z.string()).optional(),
	combineMode: z.enum(['OR', 'AND']).optional(),
});

export const DefineMeetingSeriesFormSchema = z
	.object({
		name: z
			.string()
			.min(3, {
				message: "El nombre de la serie debe tener al menos 3 caracteres.",
			}),
		description: z.string().optional(),
		defaultTime: z
			.string()
			.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
				message: "Formato de hora inválido (HH:MM).",
			}),
		defaultLocation: z
			.string()
			.min(3, { message: "La ubicación por defecto es requerida." }),
		// New field: direct audienceType selection
		audienceType: AudienceTypeEnum.default("all_active"),
		// Optional: for by_categories filtering
		audienceConfig: AudienceConfigSchema.optional(),
		// Legacy fields - kept for context/backwards compatibility
		seriesType: MeetingSeriesTypeEnum.default("general"), // Contextually set
		ownerGroupId: z.string().nullable().optional(), // Contextually set
		targetAttendeeGroups: z.array(MeetingTargetRoleEnum).optional(), // Deprecated
		frequency: MeetingFrequencyEnum,
		oneTimeDate: z.date().optional(),
		weeklyDays: z.array(DayOfWeekEnum).optional(),
		monthlyRuleType: MonthlyRuleTypeEnum.optional(),
		monthlyDayOfMonth: z.coerce.number().min(1).max(31).optional(),
		monthlyWeekOrdinal: WeekOrdinalEnum.optional(),
		monthlyDayOfWeek: DayOfWeekEnum.optional(),
		cancelledDates: z.array(z.string()).optional(),
	})
	.superRefine((data, ctx) => {
		if (data.frequency === "OneTime") {
			if (!data.oneTimeDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "La fecha es requerida para reuniones de 'Única Vez'.",
					path: ["oneTimeDate"],
				});
			}
		}
		if (data.frequency === "Weekly") {
			if (!data.weeklyDays || data.weeklyDays.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"Debe seleccionar al menos un día para la frecuencia semanal.",
					path: ["weeklyDays"],
				});
			}
		}
		if (data.frequency === "Monthly") {
			if (!data.monthlyRuleType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Debe seleccionar un tipo de regla mensual.",
					path: ["monthlyRuleType"],
				});
			} else if (data.monthlyRuleType === "DayOfMonth") {
				if (
					data.monthlyDayOfMonth === undefined ||
					data.monthlyDayOfMonth < 1 ||
					data.monthlyDayOfMonth > 31
				) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "El día del mes debe estar entre 1 y 31.",
						path: ["monthlyDayOfMonth"],
					});
				}
			} else if (data.monthlyRuleType === "DayOfWeekOfMonth") {
				if (!data.monthlyWeekOrdinal) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							"Debe seleccionar la semana ordinal (ej. Primera, Última).",
						path: ["monthlyWeekOrdinal"],
					});
				}
				if (!data.monthlyDayOfWeek) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message:
							"Debe seleccionar el día de la semana (ej. Lunes, Martes).",
						path: ["monthlyDayOfWeek"],
					});
				}
			}
		}
		// audienceType validation: require audienceConfig when by_categories is used
		if (data.audienceType === "by_categories") {
			if (!data.audienceConfig || 
				(!data.audienceConfig.roleTypeIds?.length && !data.audienceConfig.labels?.length)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"Debe seleccionar al menos un rol eclesiástico o etiqueta para filtrado por categorías.",
					path: ["audienceConfig"],
				});
			}
		}
	});
export type DefineMeetingSeriesFormValues = z.infer<
	typeof DefineMeetingSeriesFormSchema
>;

export const MeetingInstanceFormSchema = z.object({
	name: z
		.string()
		.min(3, {
			message: "El nombre de la reunión debe tener al menos 3 caracteres.",
		}),
	date: z.date({ required_error: "La fecha es requerida." }),
	time: z
		.string()
		.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
			message: "Formato de hora inválido (HH:MM).",
		}),
	location: z.string().min(3, { message: "La ubicación es requerida." }),
	description: z.string().optional(),
});
export type MeetingInstanceFormValues = z.infer<
	typeof MeetingInstanceFormSchema
>;

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
	seriesType: "general";
	ownerGroupId?: null;
}

export interface GdiMeeting extends MeetingBase {
	seriesType: "gdi";
	ownerGroupId: string; // GDI ID
}

export interface MinistryAreaMeeting extends MeetingBase {
	seriesType: "ministryArea";
	ownerGroupId: string; // MinistryArea ID
}

export type AnyMeeting = GeneralMeeting | GdiMeeting | MinistryAreaMeeting;
export type AnyMeetingWriteData = Omit<AnyMeeting, "id" | "attendeeUids"> & {
	attendeeUids?: string[];
};

// ============================================
// PAGE PROPS TYPE
// ============================================

export interface PageProps {
	params: { [key: string]: string };
	searchParams: { [key: string]: string | string[] | undefined };
}
