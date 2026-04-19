import { AlertTriangle } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * WarningBanner - Banner de Advertencia Flotante
 * 
 * Según especificaciones de diseño:
 * - Contenedor de color amarillo (#FFCA28) con icono de alerta
 * - Flota sobre la sección de grupos cuando hay obreros sin asignar
 * - Crea contraste inmediato con el entorno azul
 */

export interface WarningBannerProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string;
	message: string;
	icon?: React.ReactNode;
}

function WarningBanner({ 
	className, 
	title,
	message, 
	icon,
	...props 
}: WarningBannerProps) {
	return (
		<div 
			className={cn(
				"flex items-center gap-3 rounded-xl p-4",
				"bg-[#FFCA28]/20 border border-[#FFCA28]/40",
			"text-slate-900 dark:text-foreground",
				className
			)} 
			role="alert"
			{...props}
		>
			<div className="flex-shrink-0 rounded-full bg-[#FFCA28] p-2">
				{icon || <AlertTriangle className="h-5 w-5 text-slate-900 dark:text-foreground" />}
			</div>
			<div className="flex-1">
				{title && (
					<p className="font-semibold text-sm mb-0.5">{title}</p>
				)}
				<p className="text-sm leading-relaxed">{message}</p>
			</div>
		</div>
	);
}

export { WarningBanner };
