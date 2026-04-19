import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
	className?: string;
	iconOnly?: boolean;
}

/**
 * Grace Hub Logo Icon — silueta de iglesia minimalista
 * Cuerpo + techo triangular + campanario + cruz
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
			{/* Fondo cuadrado redondeado */}
			<rect x="0" y="0" width="40" height="40" rx="9" fill="url(#logoGradient)" />
			{/* Silueta de iglesia — blanco */}
			<g fill="white">
				{/* Cuerpo principal */}
				<rect x="8" y="26" width="24" height="12" />
				{/* Techo principal (triángulo) */}
				<polygon points="6,26 34,26 20,20" />
				{/* Campanario/torre */}
				<rect x="17.5" y="14" width="5" height="6" />
				{/* Techo del campanario (punta) */}
				<polygon points="15,14 25,14 20,8" />
				{/* Cruz — barra vertical */}
				<rect x="19" y="2" width="2" height="7" rx="1" />
				{/* Cruz — barra horizontal */}
				<rect x="16.5" y="4" width="7" height="2" rx="1" />
			</g>
		</svg>
	);
}

/**
 * Full Grace Hub Logo — layout horizontal
 */
export function GraceHubLogo({ className, iconOnly = false }: LogoProps) {
	if (iconOnly) {
		return <GraceHubIcon className={cn("h-9 w-9", className)} />;
	}

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<GraceHubIcon className="h-9 w-9 flex-shrink-0" />
			<div className="flex flex-col leading-none">
				<span className="font-bold text-lg tracking-tight text-foreground">
					Grace Hub
				</span>
				<span className="text-[10px] font-medium text-primary/80 mt-0.5">
					Church Management
				</span>
			</div>
		</div>
	);
}

/**
 * Compact horizontal logo
 */
export function GraceHubLogoHorizontal({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<GraceHubIcon className="h-8 w-8 flex-shrink-0" />
			<div className="flex flex-col leading-none">
				<span className="font-bold text-base tracking-tight text-foreground">
					Grace Hub
				</span>
				<span className="text-[9px] font-medium text-primary/80 mt-0.5">
					Church Management
				</span>
			</div>
		</div>
	);
}
