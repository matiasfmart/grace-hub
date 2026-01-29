import {
	addGdiActionSvc,
	addMinistryAreaActionSvc,
	deleteGdiActionSvc,
	deleteMinistryAreaActionSvc,
} from "@/app/actions/groupActions";
import ManageGroupsTabs from "@/components/groups/manage-groups-tabs";
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
		<div className="container mx-auto py-8 px-4">
			<div className="mb-10 text-center">
				<h1 className="font-headline text-4xl font-bold text-primary">
					Gestionar Grupos
				</h1>
				<p className="text-muted-foreground mt-2">
					Supervise las Áreas Ministeriales y GDIs dentro de la comunidad
					eclesial.
				</p>
			</div>
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
