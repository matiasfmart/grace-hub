import { UserPlus } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * VacantSlot - Espacio Vacante con Borde Punteado
 * 
 * Según especificaciones de diseño:
 * - Espacio reservado y uniforme para "Líder" y "Mentor"
 * - Permite ver vacantes (espacios vacíos con estilo dashed) de forma intuitiva
 * - Slot de Supervisión para cada grupo
 */

export interface VacantSlotProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string;
	description?: string;
	icon?: React.ReactNode;
	onAssign?: () => void;
}

function VacantSlot({ 
	className, 
	label = "Vacante",
	description,
	icon,
	onAssign,
	...props 
}: VacantSlotProps) {
	const baseClassName = cn(
		"flex items-center gap-3 rounded-xl p-4",
		"border-2 border-dashed border-slate-300 dark:border-slate-600",
		"bg-slate-50/50 dark:bg-slate-800/30",
		"text-slate-500 dark:text-slate-400",
		onAssign && "cursor-pointer hover:border-[#64B5F6]/50 hover:bg-[#E3F2FD]/30 dark:hover:bg-blue-900/20 transition-colors",
		className
	);

	const content = (
		<>
			<div className="flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 p-2">
				{icon || <UserPlus className="h-4 w-4 text-slate-400 dark:text-slate-300" />}
			</div>
			<div className="flex-1 text-left">
				<p className="font-medium text-sm">{label}</p>
				{description && (
					<p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
				)}
			</div>
		</>
	);

	if (onAssign) {
		return (
			<button
				type="button"
				className={baseClassName}
				onClick={onAssign}
			>
				{content}
			</button>
		);
	}
	
	return (
		<div className={baseClassName} {...props}>
			{content}
		</div>
	);
}

export { VacantSlot };
