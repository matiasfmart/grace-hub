import type { Metadata } from "next";
import "./globals.css";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "Grace Hub | Azure Sanctuary",
	description: "Church management with serenity and precision.",
	icons: {
		icon: "/grace.ico",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				{/* PT Sans is imported via globals.css */}
			</head>
			<body className="font-sans antialiased">
				<MainLayout>{children}</MainLayout>
				<Toaster />
			</body>
		</html>
	);
}
