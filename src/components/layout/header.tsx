import {
	CalendarDays,
	HandCoins,
	Home,
	Menu,
	Users,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { GraceHubLogo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
	{ href: "/", label: "Dashboard", icon: Home },
	{ href: "/members", label: "Miembros", icon: Users },
	{ href: "/groups", label: "Grupos", icon: UsersRound },
	{ href: "/events", label: "Eventos", icon: CalendarDays },
	{ href: "/tithes", label: "Diezmos", icon: HandCoins },
];

export default function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-16 items-center justify-between">
				<Link
					href="/"
					className="flex items-center gap-2"
					aria-label="Grace Hub Home"
				>
					<GraceHubLogo />
				</Link>

				<nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
					{navItems.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							className="transition-colors hover:text-primary"
						>
							{item.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2">
					<div className="md:hidden">
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon">
									<Menu className="h-6 w-6" />
									<span className="sr-only">Toggle Navigation</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="right">
								<nav className="flex flex-col space-y-4 mt-6">
									{navItems.map((item) => (
										<Link
											key={item.label}
											href={item.href}
											className="flex items-center gap-2 rounded-md p-2 text-lg font-medium hover:bg-accent hover:text-accent-foreground"
										>
											<item.icon className="h-5 w-5" />
											{item.label}
										</Link>
									))}
									<hr className="my-2" />
								</nav>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</header>
	);
}
