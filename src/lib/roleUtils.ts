import type { GDI, Member, MemberRoleType, MinistryArea } from "./types";
import { MemberRoleEnum } from "./types"; // Import Zod enum for type safety

export function calculateMemberRoles(
	member: Pick<Member, "id" | "assignedGDIId" | "assignedAreaIds">,
	allGdis: Pick<GDI, "id" | "guideId" | "memberIds">[],
	allMinistryAreas: Pick<MinistryArea, "id" | "leaderId" | "memberIds">[],
): MemberRoleType[] {
	const roles: MemberRoleType[] = [];

	const isGdiMember = !!member.assignedGDIId;
	const isGdiGuide = allGdis.some((gdi) => gdi.guideId === member.id);
	const isAreaLeader = allMinistryAreas.some(
		(area) => area.leaderId === member.id,
	);

	// Check if member is explicitly listed in any ministry area's memberIds
	// and is not the leader of that specific area (to avoid double-counting logic if leaderId is also in memberIds)
	const isAreaMemberParticipant = allMinistryAreas.some(
		(area) =>
			area.memberIds?.includes(member.id) && area.leaderId !== member.id,
	);

	if (isGdiMember) {
		roles.push(MemberRoleEnum.enum.GeneralAttendee);
	}

	// A Worker is a GDI Guide, an Area Leader, or an Area Member participant
	if (isGdiGuide || isAreaLeader || isAreaMemberParticipant) {
		roles.push(MemberRoleEnum.enum.Worker);
	}

	// A Leader is a GDI Guide or an Area Leader
	if (isGdiGuide || isAreaLeader) {
		roles.push(MemberRoleEnum.enum.Leader);
	}

	// Return unique roles. Leader implies Worker. Worker implies GeneralAttendee (if in GDI).
	// The current logic might assign multiple. For display, a hierarchy might be better,
	// e.g. if 'Leader', don't also show 'Worker'. But for filtering, having all applicable is fine.
	// For now, let's keep all applicable roles derived.
	return Array.from(new Set(roles));
}
