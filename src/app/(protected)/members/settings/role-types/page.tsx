export const dynamic = "force-dynamic";

import { roleTypesService } from "@/lib/api/services";
import { RoleTypesView } from "./RoleTypesView";

export default async function RoleTypesSettingsPage() {
	const roleTypes = await roleTypesService.getAll();
	return <RoleTypesView initialRoleTypes={roleTypes} />;
}
