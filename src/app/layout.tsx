import type { Metadata } from "next";
import "./globals.css";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "Grace Hub",
	description: "Integral church management application.",
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
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="font-body antialiased">
				<MainLayout>{children}</MainLayout>
				<Toaster />
			</body>
		</html>
	);
}
