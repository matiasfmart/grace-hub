'use server';
import type { Member, GDI, MinistryArea, MemberWriteData } from '@/lib/types';
import BulkAddMembersView from '@/components/members/bulk-add-members-view';
import { revalidatePath } from 'next/cache';
import { addMember, addMemberToAssignments, getAllMembersNonPaginated } from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';

const GDIS_DB_FILE_PATH = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE_PATH = 'ministry-areas-db.json';

export async function addBulkMembersAction(stagedMembersData: MemberWriteData[]): Promise<{ success: boolean; message: string }> {
  try {
    const addedMembers: Member[] = [];
    for (const memberData of stagedMembersData) {
      const newMember = await addMember(memberData);
      await addMemberToAssignments(newMember);
      addedMembers.push(newMember);
    }

    revalidatePath('/members');
    revalidatePath('/members/bulk-add');
    revalidatePath('/groups'); 
    
    return { success: true, message: `${addedMembers.length} miembro(s) guardado(s) exitosamente.` };
  } catch (error: any) {
    console.error("Error saving bulk members:", error);
    return { success: false, message: `Error al guardar miembros: ${error.message}` };
  }
}

async function getData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
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
        <h1 className="font-headline text-4xl font-bold text-primary">Agregar Múltiples Miembros</h1>
        <p className="text-muted-foreground mt-2">
          Utilice el formulario para agregar miembros a la lista de preparación. Luego, guarde todos los miembros a la vez.
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