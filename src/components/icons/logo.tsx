import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
	className?: string;
	iconOnly?: boolean;
}

/**
 * Grace Hub Logo Icon - "La Cruz del Refugio"
 * Cuadrado con esquinas suavizadas (round-2xl) + cúpula/puerta + cruz minimalista
 * Degradado 45° de #64B5F6 a #1E88E5
 */
export function GraceHubIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 40 40"
			width="40"
			height="40"
			aria-label="Grace Hub Icon"
			{...props}
		>
			<defs>
				<linearGradient id="logoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#64B5F6" />
					<stop offset="100%" stopColor="#1E88E5" />
				</linearGradient>
			</defs>
			{/* Contenedor con esquinas muy suavizadas (round-2xl ~= 40% del tamaño) */}
			<rect
				x="2"
				y="2"
				width="36"
				height="36"
				rx="10"
				ry="10"
				fill="url(#logoGradient)"
			/>
			{/* Cúpula/puerta de iglesia abstracta - base ancha (comunidad) hacia arriba (crecimiento) */}
			<path
				d="M20 8 C12 8 10 16 10 20 L10 30 C10 31.5 11 32 12 32 L28 32 C29 32 30 31.5 30 30 L30 20 C30 16 28 8 20 8"
				fill="white"
				fillOpacity="0.2"
			/>
			{/* Cruz minimalista centrada */}
			<path
				d="M20 12 L20 28 M14 20 L26 20"
				stroke="white"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/**
 * Full Grace Hub Logo - Horizontal layout (default)
 * [Icon] [Grace Hub     ]
 *        [Church Management]
 */
export function GraceHubLogo({ className, iconOnly = false }: LogoProps) {
	if (iconOnly) {
		return <GraceHubIcon className={cn("h-10 w-10", className)} />;
	}

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<GraceHubIcon className="h-10 w-10 flex-shrink-0" />
			<div className="flex flex-col">
				<span className="font-display text-xl font-bold tracking-tight text-primary leading-tight">
					Grace Hub
				</span>
				<span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground leading-tight">
					Church Management
				</span>
			</div>
		</div>
	);
}

/**
 * Compact horizontal logo for smaller spaces
 */
export function GraceHubLogoHorizontal({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<GraceHubIcon className="h-8 w-8 flex-shrink-0" />
			<div className="flex flex-col">
				<span className="font-display text-lg font-bold tracking-tight text-primary leading-tight">
					Grace Hub
				</span>
				<span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
					Church Management
				</span>
			</div>
		</div>
	);
}
