"use client";

import {
	CalendarDays,
	ChevronLeft,
	HandCoins,
	Home,
	LogOut,
	Moon,
	Sun,
	Tag,
	Users,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	useSidebar,
} from "@/components/ui/sidebar";
import { GraceHubIcon, GraceHubLogo } from "@/components/icons/logo";
import { useTheme } from "@/lib/contexts/theme-context";
import { useUser } from "@/lib/contexts/user-context";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/", label: "Dashboard", icon: Home },
	{ href: "/members", label: "Miembros", icon: Users },
	{ href: "/groups", label: "Grupos", icon: UsersRound },
	{ href: "/events", label: "Eventos", icon: CalendarDays },
	{ href: "/tithes", label: "Diezmos", icon: HandCoins },
];

function NavMenu() {
	const pathname = usePathname();
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return (
		<SidebarMenu>
			{navItems.map((item) => {
				const isActive =
					item.href === "/"
						? pathname === "/"
						: pathname.startsWith(item.href);

				return (
					<SidebarMenuItem key={item.href}>
						<SidebarMenuButton
							asChild
							isActive={isActive}
							tooltip={item.label}
						>
							<Link href={item.href}>
								<item.icon className="h-5 w-5" />
								<span
									className={cn(
										"transition-opacity duration-200",
										isCollapsed && "opacity-0"
									)}
								>
									{item.label}
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);
}

function ThemeToggle() {
	const { resolvedTheme, toggleTheme } = useTheme();
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className={cn(
				"h-10 transition-all duration-200",
				isCollapsed ? "w-10 mx-auto" : "w-full justify-start gap-3 px-2.5"
			)}
		>
			{resolvedTheme === "dark" ? (
				<Sun className="h-5 w-5 shrink-0" />
			) : (
				<Moon className="h-5 w-5 shrink-0" />
			)}
			{!isCollapsed && (
				<span className="truncate">{resolvedTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
			)}
		</Button>
	);
}

function UserMenu() {
	const { user, logout } = useUser();
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	if (!user) return null;

	const initials = user.displayName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						"h-12 transition-all duration-200",
						isCollapsed 
							? "w-10 mx-auto p-0 justify-center" 
							: "w-full justify-start gap-3 px-2.5"
					)}
				>
					<Avatar className="h-8 w-8 shrink-0">
						<AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
							{initials}
						</AvatarFallback>
					</Avatar>
					{!isCollapsed && (
						<div className="flex flex-col items-start text-left">
							<span className="text-base font-medium truncate max-w-[140px]">
								{user.displayName}
							</span>
							<span className="text-xs text-muted-foreground capitalize">
								{user.role}
							</span>
						</div>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled>
					Perfil (próximamente)
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/members/settings/role-types" className="flex items-center gap-2">
						<Tag className="h-4 w-4" />
						Etiquetas Eclesiásticas
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-destructive focus:text-destructive cursor-pointer"
					onClick={() => void logout()}
				>
					<LogOut className="h-4 w-4 mr-2" />
					Cerrar Sesión
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function CollapseToggle() {
	const { toggleSidebar, state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleSidebar}
			className="h-7 w-7 absolute -right-3 top-6 z-50 rounded-full border bg-background shadow-md hover:bg-accent"
		>
			<ChevronLeft
				className={cn(
					"h-4 w-4 transition-transform duration-200",
					isCollapsed && "rotate-180"
				)}
			/>
			<span className="sr-only">
				{isCollapsed ? "Expandir" : "Colapsar"} sidebar
			</span>
		</Button>
	);
}

export function AppSidebar() {
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return (
		<Sidebar collapsible="icon" className="border-r-0">
			{/* Collapse toggle button */}
			<CollapseToggle />

			{/* Header with Logo */}
			<SidebarHeader className="relative">
				<div
					className={cn(
						"flex items-center py-4 transition-all duration-200",
						isCollapsed ? "justify-center px-0" : "px-2.5"
					)}
				>
					{isCollapsed ? (
						<GraceHubIcon className="h-7 w-7" />
					) : (
						<GraceHubLogo />
					)}
				</div>
			</SidebarHeader>

			<SidebarSeparator />

			{/* Navigation */}
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<NavMenu />
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />

			{/* Footer with Theme Toggle and User */}
			<SidebarFooter className={cn("gap-2 px-4", isCollapsed && "px-2")}>
				<ThemeToggle />
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
