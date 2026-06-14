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

async function getGroupsData(): Promise<{
	ministryAreas: MinistryArea[];
	gdis: GDI[];
	members: Member[];
}> {
	const [ministryAreas, gdis, members] = await Promise.all([
		getAllMinistryAreas(),
		getAllGdis(),
		getAllMembersNonPaginated(),
	]);
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
