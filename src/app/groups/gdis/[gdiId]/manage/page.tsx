// This page component is no longer directly used for UI.
// Its primary purpose was to host the updateGdiDetailsAction and fetch data.
// The action has been moved to src/app/groups/gdis/[gdiId]/admin/actions.ts
// Data fetching for ManageSingleGdiView will now occur in the admin page that hosts the dialog.

// For now, this file can be left empty or redirect, or be deleted.
// To prevent build errors if something still tries to import from it,
// we can export a simple default component.
// Ideally, all imports would be updated to the new action location.

import { redirect } from "next/navigation";

export default async function ManageGdiPage_DEPRECATED({
	params,
}: {
	params: Promise<{ gdiId: string }>;
}) {
	// Redirect to the new admin page, as this page is no longer the primary edit location.
	const { gdiId } = await params;
	redirect(`/groups/gdis/${gdiId}/admin`);
	// return null; // Or simply return null if redirection is handled elsewhere or not desired.
}

// The updateGdiDetailsAction has been moved to ./admin/actions.ts
// The getData function is no longer needed here as the admin page will fetch data.
