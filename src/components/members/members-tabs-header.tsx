"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type MembersTab = "miembros" | "nuevos" | "bajas";

interface MembersTabsHeaderProps {
	activeTab: MembersTab;
	pendingProspectsCount?: number;
}

const tabs: { id: MembersTab; label: string }[] = [
	{ id: "miembros", label: "Miembros" },
	{ id: "nuevos", label: "Nuevos ingresos" },
	{ id: "bajas", label: "Dados de baja" },
];

export default function MembersTabsHeader({
	activeTab,
	pendingProspectsCount = 0,
}: MembersTabsHeaderProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const navigateToTab = (tab: MembersTab) => {
		const params = new URLSearchParams();
		// Preserve only non-tab, non-pagination params
		const preserve = ["pageSize"];
		preserve.forEach((key) => {
			const val = searchParams.get(key);
			if (val) params.set(key, val);
		});
		if (tab !== "miembros") params.set("tab", tab);
		const qs = params.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname);
	};

	return (
		<div className="flex gap-1 rounded-md bg-muted p-1 w-fit">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => navigateToTab(tab.id)}
					className={cn(
						"inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
						activeTab === tab.id
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{tab.label}
					{tab.id === "nuevos" && pendingProspectsCount > 0 && (
						<Badge
							variant="secondary"
							className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
						>
							{pendingProspectsCount}
						</Badge>
					)}
				</button>
			))}
		</div>
	);
}
