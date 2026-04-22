"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authEndpoint } from "@/lib/api/endpoints/authEndpoint";

/**
 * User entity representing the authenticated user.
 */
export interface User {
	id: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	role: "admin" | "leader" | "member";
}

interface UserContextValue {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
	children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		authEndpoint
			.me()
			.then((me) => {
				setUser({
					id: String(me.id),
					email: me.email,
					displayName: me.email.split("@")[0],
					role: "admin",
				});
			})
			.catch(() => {
				setUser(null);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	const logout = async () => {
		await authEndpoint.logout();
		setUser(null);
		window.location.href = "/login";
	};

	return (
		<UserContext.Provider
			value={{
				user,
				isAuthenticated: user !== null,
				isLoading,
				logout,
			}}
		>
			{children}
		</UserContext.Provider>
	);
}

export function useUser(): UserContextValue {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}

/**
 * Hook that throws if user is not authenticated.
 * Use in protected routes/components.
 */
export function useRequiredUser(): User {
	const { user } = useUser();
	if (!user) {
		throw new Error("User must be authenticated");
	}
	return user;
}
