import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	/** Main page title */
	title: string;
	/** Optional subtitle/description */
	description?: string;
	/** Optional actions (buttons, filters) aligned to the right */
	actions?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Consistent page header component following UX best practices:
 * - Left-aligned title (natural reading flow with sidebar layout)
 * - Clear visual hierarchy (title > description)
 * - Actions area for primary page operations
 * - Consistent spacing across all views
 */
export function PageHeader({
	title,
	description,
	actions,
	className,
}: PageHeaderProps) {
	return (
		<header className={cn("mb-6", className)}>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						{title}
					</h1>
					{description && (
						<p className="text-sm text-muted-foreground max-w-2xl">
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
						{actions}
					</div>
				)}
			</div>
		</header>
	);
}
