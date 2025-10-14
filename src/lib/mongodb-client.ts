// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient } from "mongodb";

// Validación de variables de entorno SOLO en runtime
if (process.env.NEXT_PHASE !== "phase-production-build") {
	if (!process.env.MONGODB_USER) {
		throw new Error('Invalid/Missing environment variable: "MONGODB_USER"');
	}
	if (!process.env.MONGODB_PASSWORD) {
		throw new Error('Invalid/Missing environment variable: "MONGODB_PASSWORD"');
	}
	if (!process.env.MONGODB_CLUSTER_URL) {
		throw new Error(
			'Invalid/Missing environment variable: "MONGODB_CLUSTER_URL"',
		);
	}
}

// Usar valores dummy durante el build, reales en runtime
const MONGODB_USER = process.env.MONGODB_USER || "dummy";
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || "dummy";
const MONGODB_CLUSTER_URL =
	process.env.MONGODB_CLUSTER_URL || "dummy.mongodb.net";

// Construct the full URI from the separate parts.
const uri = `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER_URL}/?retryWrites=true&w=majority&appName=Cluster0`;

const options = {
	// SSL/TLS configuration to fix SSL errors in Windows environments
	tls: true,
	tlsAllowInvalidCertificates: true, // Temporarily allow invalid certificates for Windows SSL issues
	tlsAllowInvalidHostnames: false,
	// Increase timeouts for better stability
	serverSelectionTimeoutMS: 10000,
	socketTimeoutMS: 45000,
	connectTimeoutMS: 10000,
	// Additional stability options
	maxPoolSize: 10,
	minPoolSize: 2,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// NO conectar a MongoDB durante el build
if (process.env.NEXT_PHASE === "phase-production-build") {
	console.log("[MongoDB] Build phase detected - using mock client");

	// Mock client para satisfacer el build sin conectarse
	clientPromise = Promise.resolve({
		db: () => ({
			collection: () => ({
				find: () => ({
					toArray: async () => [],
					limit: () => ({ toArray: async () => [] }),
					skip: () => ({ toArray: async () => [] }),
					sort: () => ({ toArray: async () => [] }),
				}),
				findOne: async () => null,
				insertOne: async () => ({ insertedId: "mock", acknowledged: true }),
				insertMany: async () => ({
					insertedIds: {},
					insertedCount: 0,
					acknowledged: true,
				}),
				updateOne: async () => ({
					modifiedCount: 0,
					matchedCount: 0,
					acknowledged: true,
				}),
				updateMany: async () => ({
					modifiedCount: 0,
					matchedCount: 0,
					acknowledged: true,
				}),
				deleteOne: async () => ({ deletedCount: 0, acknowledged: true }),
				deleteMany: async () => ({ deletedCount: 0, acknowledged: true }),
				countDocuments: async () => 0,
				aggregate: () => ({ toArray: async () => [] }),
			}),
		}),
		close: async () => {},
	} as any);
} else if (process.env.NODE_ENV === "development") {
	// In development mode, use a global variable so that the value
	// is preserved across module reloads caused by HMR (Hot Module Replacement).
	const globalWithMongo = global as typeof globalThis & {
		_mongoClientPromise?: Promise<MongoClient>;
	};

	if (!globalWithMongo._mongoClientPromise) {
		client = new MongoClient(uri, options);
		globalWithMongo._mongoClientPromise = client.connect();
	}
	clientPromise = globalWithMongo._mongoClientPromise;
} else {
	// In production mode, it's best to not use a global variable.
	client = new MongoClient(uri, options);
	clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
