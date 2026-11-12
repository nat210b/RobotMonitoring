import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * Shared MongoDB connection for server code (Route Handlers, Server Components, Server Actions).
 * Reads MONGODB_URI and MONGODB_DB from .env — never import this from a Client Component.
 *
 * One MongoClient is reused for the whole process. In development it is kept on globalThis
 * so hot reloads don't open a new connection pool on every file save.
 */
const globalForMongo = globalThis as unknown as { _mongoClient?: Promise<MongoClient> };

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add it to .env (see .env.example).");

  if (!globalForMongo._mongoClient) {
    const client = new MongoClient(uri, { appName: "robot_monitoring", serverSelectionTimeoutMS: 5000 });
    globalForMongo._mongoClient = client.connect().catch((err) => {
      globalForMongo._mongoClient = undefined; // let the next call retry instead of caching the failure
      throw err;
    });
  }
  return globalForMongo._mongoClient;
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise();
}

/** The app database (MONGODB_DB), or the one named in the URI path when MONGODB_DB is unset. */
export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || undefined);
}
