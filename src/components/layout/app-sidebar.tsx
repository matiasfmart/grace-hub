"use client";

import {
	BadgeCheck,
	Calendar,
	LayoutDashboard,
	LogOut,
	Moon,
	PanelLeftClose,
	PanelLeftOpen,
	Sun,
	Tag,
	UserRound,
	Users,
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

	useSidebar,
} from "@/components/ui/sidebar";
import { GraceHubIcon, GraceHubLogo } from "@/components/icons/logo";
import { useTheme } from "@/lib/contexts/theme-context";
import { useUser } from "@/lib/contexts/user-context";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/",        label: "Panel",    icon: LayoutDashboard },
	{ href: "/members", label: "Miembros", icon: UserRound },
	{ href: "/groups",  label: "Grupos",   icon: Users },
	{ href: "/events",  label: "Eventos",  icon: Calendar },
	{ href: "/tithes",  label: "Diezmos",  icon: BadgeCheck },
];

function NavMenu() {
	const pathname = usePathname();

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
								<item.icon className="h-[18px] w-[18px] shrink-0" />
								<span>{item.label}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);
}

function UserMenu() {
	const { user, logout } = useUser();
	const { resolvedTheme, toggleTheme } = useTheme();
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
					className="transition-all duration-200"
				>
					<Avatar className="h-8 w-8 shrink-0">
						<AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-start text-left overflow-hidden">
						<span className="text-sm font-medium truncate max-w-[140px]">
							{user.displayName}
						</span>
						<span className="text-xs text-muted-foreground capitalize">
							{user.role}
						</span>
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
					{resolvedTheme === "dark" ? (
						<Sun className="h-4 w-4" />
					) : (
						<Moon className="h-4 w-4" />
					)}
					{resolvedTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}
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
			onClick={toggleSidebar}
			title={isCollapsed ? "Expandir" : "Colapsar"}
			className="opacity-50 hover:opacity-100 transition-all duration-200"
		>
			{isCollapsed ? (
				<PanelLeftOpen className="h-5 w-5 shrink-0" />
			) : (
				<PanelLeftClose className="h-5 w-5 shrink-0" />
			)}
			<span className="sr-only">{isCollapsed ? "Expandir" : "Colapsar"} sidebar</span>
		</Button>
	);
}

export function AppSidebar() {
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return (
		<Sidebar collapsible="icon" className="border-r-0 border-0">
			{/* Header with Logo */}
			<SidebarHeader>
				<div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-start")}>
					{isCollapsed ? (
						<GraceHubIcon className="h-7 w-7" />
					) : (
						<GraceHubLogo />
					)}
				</div>
			</SidebarHeader>

			{/* Navigation */}
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<NavMenu />
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			{/* Footer — empujado al fondo con aire */}
			<SidebarFooter>
				<div className="flex flex-row items-center gap-1 w-full">
					<UserMenu />
					<CollapseToggle />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
