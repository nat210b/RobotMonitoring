import { getDb } from "@/app/lib/mongodb";

/** GET /api/v1/health — checks the MongoDB connection and lists the app database's collections. */
export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
    return Response.json({ ok: true, database: db.databaseName, collections });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
