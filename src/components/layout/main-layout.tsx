"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider, UserProvider } from "@/lib/contexts";

interface MainLayoutProps {
	children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<ThemeProvider defaultTheme="system">
			<UserProvider>
				<SidebarProvider defaultOpen={true}>
					<AppSidebar />
					<SidebarInset className="min-w-0">
						<main className="flex-1 p-6 lg:p-8">{children}</main>
					</SidebarInset>
				</SidebarProvider>
			</UserProvider>
		</ThemeProvider>
	);
}
