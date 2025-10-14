import { addBulkMembersAction } from "@/app/actions/memberActions";
import BulkAddMembersView from "@/components/members/bulk-add-members-view";
import type { GDI, Member, MinistryArea } from "@/lib/types";
import { getAllGdis } from "@/services/gdiService";
import { getAllMembersNonPaginated } from "@/services/memberService";
import { getAllMinistryAreas } from "@/services/ministryAreaService";

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
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8 text-center">
				<h1 className="font-headline text-4xl font-bold text-primary">
					Agregar Múltiples Miembros
				</h1>
				<p className="text-muted-foreground mt-2">
					Utilice el formulario para agregar miembros a la lista de preparación.
					Luego, guarde todos los miembros a la vez.
				</p>
			</div>
			<BulkAddMembersView
				allGDIs={gdis}
				allMinistryAreas={ministryAreas}
				allMembers={members} // This will now be an array
				addBulkMembersAction={addBulkMembersAction}
			/>
		</div>
	);
}
