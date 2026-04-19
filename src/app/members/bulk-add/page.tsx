import { addBulkMembersAction } from "@/app/actions/memberActions";
import BulkAddMembersView from "@/components/members/bulk-add-members-view";
import { PageHeader } from "@/components/ui/page-header";
import type { GDI, Member, MinistryArea } from "@/lib/types";
import {
	getAllGdis,
	getAllMembersNonPaginated,
	getAllMinistryAreas,
} from "@/lib/api/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<{
	members: Member[];
	gdis: GDI[];
	ministryAreas: MinistryArea[];
}> {
	const membersData = await getAllMembersNonPaginated();
	const gdis = await getAllGdis();
	const ministryAreas = await getAllMinistryAreas();
	return { members: membersData, gdis, ministryAreas };
}

export default async function BulkAddMembersPage() {
	const { members, gdis, ministryAreas } = await getData();

	return (
		<div className="container mx-auto py-6 px-4">
			<PageHeader
				title="Agregar Múltiples Miembros"
				description="Importar varios miembros a la vez desde la lista de miembros."
			/>
			<BulkAddMembersView
				allGDIs={gdis}
				allMinistryAreas={ministryAreas}
				allMembers={members}
				addBulkMembersAction={addBulkMembersAction}
			/>
		</div>
	);
}
