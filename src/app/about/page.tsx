import { Handshake, Target, Users } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
	return (
		<div className="container mx-auto py-12 px-4">
			<section className="text-center mb-16">
				<h1 className="font-headline text-5xl font-bold text-primary mb-4">
					About Grace Hub
				</h1>
				<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
					Grace Hub is dedicated to fostering a vibrant, connected, and
					spiritually growing church community through technology.
				</p>
			</section>

			<section className="mb-16">
				<div className="relative w-full h-80 rounded-lg overflow-hidden shadow-xl">
					<Image
						src="https://placehold.co/1200x400"
						alt="Church building or diverse congregation"
						layout="fill"
						objectFit="cover"
						data-ai-hint="church congregation"
					/>
				</div>
			</section>

			<section className="grid md:grid-cols-3 gap-8 mb-16">
				<Card className="text-center hover:shadow-lg transition-shadow">
					<CardHeader>
						<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
							<Target className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="font-headline text-2xl">
							Our Mission
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							To provide an accessible and intuitive platform that empowers
							church members and leaders, facilitating seamless communication,
							resource sharing, and active participation in church life.
						</p>
					</CardContent>
				</Card>
				<Card className="text-center hover:shadow-lg transition-shadow">
					<CardHeader>
						<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
							<Users className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="font-headline text-2xl">
							Our Community
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							We believe in the power of fellowship and strive to create tools
							that bring people closer to God and one another, strengthening the
							bonds within our church family.
						</p>
					</CardContent>
				</Card>
				<Card className="text-center hover:shadow-lg transition-shadow">
					<CardHeader>
						<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
							<Handshake className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="font-headline text-2xl">Our Values</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Faith, integrity, service, and innovation guide our development
							efforts. We are committed to serving the church with excellence
							and a heart for ministry.
						</p>
					</CardContent>
				</Card>
			</section>

			<section className="text-center bg-card p-8 rounded-lg shadow-md">
				<h2 className="font-headline text-3xl font-semibold mb-4">
					Join Us on Our Journey
				</h2>
				<p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
					We are excited about what God is doing through Grace Hub and invite
					you to explore, connect, and grow with us.
				</p>
				{/* Potential CTA to contact or get involved */}
			</section>
		</div>
	);
}
