import type { SVGProps } from "react";

export function GraceHubLogo(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 200 50"
			width="120"
			height="30"
			aria-label="Grace Hub Logo"
			{...props}
		>
			<rect width="200" height="50" fill="none" />
			<text
				x="10"
				y="35"
				fontFamily="PT Sans, sans-serif"
				fontSize="30"
				fontWeight="bold"
				fill="hsl(var(--primary))"
			>
				Grace Hub
			</text>
		</svg>
	);
}
