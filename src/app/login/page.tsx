"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraceHubIcon } from "@/components/icons/logo";
import { useTheme, ThemeProvider } from "@/lib/contexts";

function ThemeToggleButton() {
	const { resolvedTheme, toggleTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className="absolute top-4 right-4 h-9 w-9"
			aria-label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
		>
			{resolvedTheme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
}

export default function LoginPage() {
	return (
		<ThemeProvider defaultTheme="system">
			<LoginForm />
		</ThemeProvider>
	);
}

function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			if (!res.ok) {
				const status = res.status;
				if (status === 401 || status === 400) {
					setError("Email o contraseña incorrectos.");
				} else {
					setError("Error al iniciar sesión. Intenta de nuevo.");
				}
				return;
			}
			// Redirect to original destination — validate to prevent open redirect (OWASP A01)
			const params = new URLSearchParams(window.location.search);
			const returnTo = params.get('returnTo') ?? '/';
			const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
			window.location.href = safePath;
		} catch {
			setError("Error al iniciar sesión. Intenta de nuevo.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="relative min-h-screen flex items-center justify-center bg-background px-4">
			<ThemeToggleButton />

			<div className="w-full max-w-sm space-y-6">
				{/* Brand */}
				<div className="flex flex-col items-center space-y-3">
					<GraceHubIcon className="h-14 w-14" />
					<div className="text-center space-y-0.5">
						<h1 className="text-2xl font-bold tracking-tight">Grace Hub</h1>
						<p className="text-xs font-medium text-primary/80">Church Management</p>
					</div>
					<p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="correo@ejemplo.com"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Contraseña</Label>
						<div className="relative">
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="pr-10"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
								aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button type="submit" disabled={isLoading} className="w-full">
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Ingresando...
							</>
						) : (
							"Ingresar"
						)}
					</Button>
				</form>
			</div>
		</div>
	);
}
