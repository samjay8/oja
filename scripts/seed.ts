import "dotenv/config";
import { getDb } from "../src/db";
import { seed } from "../src/db/seed";

const key = process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026";
const db = await getDb();
const r = await seed(db, { vendorKey: key });
console.log(r.created ? "Seeded demo shops." : "Demo shops already exist; dashboard key refreshed.");
process.exit(0);
