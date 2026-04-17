"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * User entity representing the authenticated user.
 * This is prepared for future authentication integration.
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
	// Future: login, logout, updateProfile methods
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Mock user for development.
 * Replace with real authentication when implemented.
 */
const MOCK_USER: User = {
	id: "mock-user-001",
	email: "admin@gracehub.church",
	displayName: "Administrador",
	role: "admin",
};

interface UserProviderProps {
	children: ReactNode;
	/** Override mock user for testing */
	mockUser?: User | null;
}

export function UserProvider({ children, mockUser }: UserProviderProps) {
	// For now, always return the mock user
	// Future: integrate with real auth (NextAuth, Clerk, etc.)
	const user = mockUser !== undefined ? mockUser : MOCK_USER;

	return (
		<UserContext.Provider
			value={{
				user,
				isAuthenticated: user !== null,
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
