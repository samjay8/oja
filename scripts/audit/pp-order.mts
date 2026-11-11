// Read a sandbox PayPal order's status, amount and payee (no secrets printed).
//   tsx --conditions=react-server --tsconfig tsconfig.json scripts/audit/pp-order.mts <paypal-order-id>
import { config } from "dotenv";
config({ path: ".env.local" });
const { getOrder } = await import("../../src/lib/paypal");
const o = (await getOrder(process.argv[2])) as unknown as { status: string; purchase_units: { amount: { value: string; currency_code: string }; payee?: { email_address?: string; merchant_id?: string }; payments?: unknown }[] };
const u = o.purchase_units?.[0];
console.log(JSON.stringify({ status: o.status, amount: u?.amount, payee: u?.payee, payments: u?.payments }, null, 1));
process.exit(0);
