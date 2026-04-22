"use server";

import { revalidatePath } from "next/cache";
import { roleTypesService } from "@/lib/api/services";
import type { RoleType } from "@/lib/api/mappers";

export async function createRoleTypeAction(
	name: string,
): Promise<{ success: boolean; message: string; roleType?: RoleType }> {
	try {
		const roleType = await roleTypesService.create(name);
		revalidatePath("/members/settings/role-types");
		return { success: true, message: `Etiqueta "${roleType.name}" creada correctamente`, roleType };
	} catch {
		return { success: false, message: "No se pudo crear la etiqueta" };
	}
}

export async function updateRoleTypeAction(
	id: string,
	name: string,
): Promise<{ success: boolean; message: string; roleType?: RoleType }> {
	try {
		const roleType = await roleTypesService.update(id, name);
		revalidatePath("/members/settings/role-types");
		return { success: true, message: `Etiqueta renombrada a "${roleType.name}"`, roleType };
	} catch {
		return { success: false, message: "No se pudo actualizar la etiqueta" };
	}
}

export async function deleteRoleTypeAction(
	id: string,
	name: string,
): Promise<{ success: boolean; message: string }> {
	try {
		await roleTypesService.delete(id);
		revalidatePath("/members/settings/role-types");
		revalidatePath("/members");
		return { success: true, message: `Etiqueta "${name}" eliminada` };
	} catch {
		return {
			success: false,
			message: "No se pudo eliminar la etiqueta. Puede que esté asignada a algún miembro.",
		};
	}
}
