import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
	className?: string;
	iconOnly?: boolean;
}

/**
 * Grace Hub Logo Icon — cruz minimalista sobre fondo redondeado
 */
export function GraceHubIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 36 36"
			aria-label="Grace Hub"
			{...props}
		>
			{/* Fondo */}
			<rect width="36" height="36" rx="10" className="fill-primary" />
			{/* Cruz vertical — 3.5px, centrada en x=18 */}
			<rect x="16.25" y="7" width="3.5" height="22" rx="1.75" className="fill-primary-foreground" />
			{/* Cruz horizontal — 3.5px, centrada en x=18, arm ratio 7:12 desde barra vertical */}
			<rect x="9" y="13.75" width="18" height="3.5" rx="1.75" className="fill-primary-foreground" />
		</svg>
	);
}

/**
 * Full Grace Hub Logo — layout horizontal
 */
export function GraceHubLogo({ className }: LogoProps) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<GraceHubIcon className="h-8 w-8 flex-shrink-0" />
			<div className="flex flex-col justify-center">
				<span className="font-semibold text-base tracking-tight text-foreground leading-tight">
					grace hub
				</span>
				<span className="text-[11px] font-medium tracking-wider text-muted-foreground leading-tight mt-0.5">
					church management
				</span>
			</div>
		</div>
	);
}


