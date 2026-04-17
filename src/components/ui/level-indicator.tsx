import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * LevelIndicator - Indicador de Nivel L1-L4
 * 
 * Según especificaciones de diseño:
 * - Formato: Círculos con texto centralizado
 * - Tipografía: font-bold, text-xs (12px)
 * - Transformación: uppercase
 */

const levelIndicatorVariants = cva(
	"inline-flex items-center justify-center rounded-full font-bold text-xs uppercase",
	{
		variants: {
			level: {
				L1: "bg-emerald-100 text-emerald-700 border border-emerald-200",
				L2: "bg-blue-100 text-blue-700 border border-blue-200",
				L3: "bg-amber-100 text-amber-700 border border-amber-200",
				L4: "bg-purple-100 text-purple-700 border border-purple-200",
			},
			size: {
				default: "h-7 w-7 text-xs",
				sm: "h-5 w-5 text-[10px]",
				lg: "h-9 w-9 text-sm",
			},
		},
		defaultVariants: {
			level: "L1",
			size: "default",
		},
	},
);

export interface LevelIndicatorProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof levelIndicatorVariants> {
	level: "L1" | "L2" | "L3" | "L4";
}

function LevelIndicator({ className, level, size, ...props }: LevelIndicatorProps) {
	return (
		<div 
			className={cn(levelIndicatorVariants({ level, size }), className)} 
			title={`Nivel ${level}`}
			{...props}
		>
			{level}
		</div>
	);
}

export { LevelIndicator, levelIndicatorVariants };
