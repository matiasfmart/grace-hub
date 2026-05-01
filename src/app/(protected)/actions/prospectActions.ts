"use server";

import { revalidatePath } from "next/cache";
import { prospectsService } from "@/lib/api/services";
import type { Prospect } from "@/lib/types";

export interface CreateProspectInput {
	firstName: string;
	lastName: string;
	visitDate: string; // YYYY-MM-DD
	contact?: string;
	notes?: string;
	addedBy?: number;
}

export interface UpdateProspectInput {
	firstName?: string;
	lastName?: string;
	contact?: string;
	notes?: string;
	visitDate?: string;
}

export async function createProspectAction(
	data: CreateProspectInput,
): Promise<{ success: boolean; message: string; prospect?: Prospect }> {
	try {
		const prospect = await prospectsService.create({
			firstName: data.firstName.trim(),
			lastName: data.lastName.trim(),
			visitDate: data.visitDate,
			contact: data.contact?.trim() || undefined,
			notes: data.notes?.trim() || undefined,
			source: "manual",
			addedBy: data.addedBy,
		});
		revalidatePath("/members");
		return { success: true, message: "Visitante registrado exitosamente.", prospect };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, message: `Error al registrar: ${msg}` };
	}
}

export async function getProspectsByStatusAction(
	status: "pending" | "integrated" | "lost",
): Promise<{ success: boolean; data: Prospect[]; message?: string }> {
	try {
		let data: Prospect[];
		if (status === "pending") data = await prospectsService.getPending();
		else if (status === "integrated") data = await prospectsService.getIntegrated();
		else data = await prospectsService.getLost();
		return { success: true, data };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, data: [], message: msg };
	}
}

export async function getProspectByIdAction(
	prospectId: string,
): Promise<{ success: boolean; data?: Prospect; message?: string }> {
	try {
		const data = await prospectsService.getById(prospectId);
		return { success: true, data };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, message: msg };
	}
}

export async function updateProspectAction(
	prospectId: string,
	data: UpdateProspectInput,
): Promise<{ success: boolean; message: string; prospect?: Prospect }> {
	try {
		const prospect = await prospectsService.updateFields(prospectId, {
			firstName: data.firstName?.trim(),
			lastName: data.lastName?.trim(),
			contact: data.contact?.trim() || undefined,
			notes: data.notes?.trim() || undefined,
			visitDate: data.visitDate,
		});
		revalidatePath("/members");
		return { success: true, message: "Visitante actualizado.", prospect };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, message: `Error al actualizar: ${msg}` };
	}
}

export async function integrateProspectAction(
	prospectId: string,
	gdiId?: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await prospectsService.integrate(prospectId, gdiId);
		revalidatePath("/members");
		revalidatePath("/");
		return { success: true, message: "Visitante integrado exitosamente." };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, message: `Error: ${msg}` };
	}
}

export async function archiveProspectAction(
	prospectId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await prospectsService.archive(prospectId);
		revalidatePath("/members");
		revalidatePath("/");
		return { success: true, message: "Visitante archivado." };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, message: `Error: ${msg}` };
	}
}
