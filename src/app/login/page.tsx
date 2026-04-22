"use client";

import { useState, type FormEvent } from "react";
import { authEndpoint } from "@/lib/api/endpoints/authEndpoint";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			await authEndpoint.login({ email, password });
			// Full reload ensures middleware sees the new cookie
			window.location.href = '/';
		} catch (err) {
			const status = (err as { statusCode?: number })?.statusCode;
			if (status === 401 || status === 400) {
				setError("Email o contraseña incorrectos.");
			} else {
				setError("Error al iniciar sesión. Intenta de nuevo.");
			}
			setIsLoading(false);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm space-y-6">
				{/* Logo / Brand */}
				<div className="text-center space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Grace Hub</h1>
					<p className="text-sm text-muted-foreground">
						Inicia sesión para continuar
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium">
							Email
						</label>
						<input
							id="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="admin@gracehub.church"
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium">
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="••••••••"
						/>
					</div>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<button
						type="submit"
						disabled={isLoading}
						className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
					>
						{isLoading ? "Ingresando..." : "Ingresar"}
					</button>
				</form>
			</div>
		</div>
	);
}
