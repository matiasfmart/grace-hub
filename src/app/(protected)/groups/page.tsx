import {
	addGdiActionSvc,
	addMinistryAreaActionSvc,
	deleteGdiActionSvc,
	deleteMinistryAreaActionSvc,
} from "@/app/(protected)/actions/groupActions";
import ManageGroupsTabs from "@/components/groups/manage-groups-tabs";
import { PageHeader } from "@/components/ui/page-header";
import type { GDI, Member, MinistryArea } from "@/lib/types";
import {
	getAllGdis,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGroupsData(): Promise<{
	ministryAreas: MinistryArea[];
	gdis: GDI[];
	members: Member[];
}> {
	const ministryAreas = await getAllMinistryAreas();
	const gdis = await getAllGdis();
	const members = await getAllMembersNonPaginated();
	return { ministryAreas, gdis, members };
}

export default async function GroupsPage() {
	const { ministryAreas, gdis, members } = await getGroupsData();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Grupos"
				description="Administra GDIs y Áreas Ministeriales."
			/>
			<ManageGroupsTabs
				initialMinistryAreas={ministryAreas}
				initialGdis={gdis}
				allMembers={members}
				addMinistryAreaAction={addMinistryAreaActionSvc}
				addGdiAction={addGdiActionSvc}
				deleteGdiAction={deleteGdiActionSvc}
				deleteMinistryAreaAction={deleteMinistryAreaActionSvc}
			/>
		</div>
	);
}
