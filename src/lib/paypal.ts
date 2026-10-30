// PayPal through the official Agent Toolkit, called from code, not by the model.
// The model never sees these tools: every amount here is computed by Oja's pricing
// code and read back from the database. Sandbox only.

import "server-only";
import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";
import { toDecimalNumber } from "./money";
import type { OrderLine, ShipTo } from "@/db/schema";

type ToolkitTool = { parameters: { parse: (v: unknown) => unknown }; execute: (args: unknown, opts?: unknown) => Promise<string> };

let toolkit: PayPalAgentToolkit | null = null;

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function kit(): PayPalAgentToolkit {
  if (!paypalConfigured()) throw new Error("PayPal sandbox credentials are not set (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)");
  if (process.env.PAYPAL_ENVIRONMENT && process.env.PAYPAL_ENVIRONMENT !== "SANDBOX") {
    throw new Error("Oja runs on the PayPal sandbox only");
  }
  toolkit ??= new PayPalAgentToolkit({
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    configuration: {
      // Least privilege: only what Oja's code calls.
      actions: {
        orders: { create: true, get: true, capture: true },
        shipment: { create: true, get: true },
        disputes: { list: true, get: true },
        transactions: { list: true },
      },
      context: { sandbox: true },
    },
  });
  return toolkit;
}

async function call<T>(name: string, args: unknown): Promise<T> {
  const tools = kit().getTools() as unknown as Record<string, ToolkitTool>;
  const tool = tools[name];
  if (!tool) throw new Error(`PayPal toolkit tool ${name} is not enabled`);
  const parsed = tool.parameters.parse(args);
  const raw = await tool.execute(parsed, { toolCallId: `oja-${name}`, messages: [] });
  const out = JSON.parse(raw) as T & { error?: { message?: string } };
  if (out && typeof out === "object" && "error" in out && out.error) {
    throw new PayPalError(name, out.error.message ?? JSON.stringify(out.error), out);
  }
  return out;
}

export class PayPalError extends Error {
  constructor(public tool: string, message: string, public detail: unknown) {
    super(`PayPal ${tool}: ${message}`);
  }
}

type PayPalLink = { href: string; rel: string };
type PayPalOrder = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: {
    shipping?: { name?: { full_name?: string }; address?: Record<string, string> };
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
  }[];
  payer?: { email_address?: string };
};

export async function createCheckout(input: {
  currency: "USD";
  lines: OrderLine[];
  shippingMinor: number;
  shipTo: ShipTo;
  returnUrl: string;
  cancelUrl: string;
  note: string;
}): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const order = await call<PayPalOrder>("create_order", {
    currencyCode: input.currency,
    items: input.lines.map((l) => ({
      name: l.name.slice(0, 127),
      quantity: l.qty,
      itemCost: toDecimalNumber(l.unitPriceMinor),
      taxPercent: 0,
      itemTotal: toDecimalNumber(l.unitPriceMinor * l.qty),
    })),
    shippingCost: toDecimalNumber(input.shippingMinor),
    discount: 0,
    shippingAddress: {
      address_line_1: input.shipTo.line1,
      address_line_2: input.shipTo.line2,
      admin_area_2: input.shipTo.city,
      admin_area_1: input.shipTo.state,
      postal_code: input.shipTo.postalCode,
      country_code: input.shipTo.country,
    },
    notes: input.note,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
  });
  const approve = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!approve) throw new PayPalError("create_order", "no approval link returned", order);
  return { paypalOrderId: order.id, approveUrl: approve.href };
}

export async function getOrder(paypalOrderId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>("get_order", { id: paypalOrderId });
}

export type CaptureResult = {
  captureId: string;
  amountMinor: number;
  currency: string;
  /** Address on the PayPal transaction. Seller Protection requires shipping here. */
  shipTo?: Partial<ShipTo>;
  payerEmail?: string;
};

export async function captureOrder(paypalOrderId: string): Promise<CaptureResult> {
  const res = await call<{ status: string; response: PayPalOrder }>("pay_order", { id: paypalOrderId });
  let order = res.response;
  if (res.status !== "success") {
    // Already captured (e.g. return page reloaded): read the order instead.
    order = await getOrder(paypalOrderId);
  }
  const unit = order.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  if (!cap || (cap.status !== "COMPLETED" && cap.status !== "PENDING")) {
    throw new PayPalError("pay_order", `capture not completed (${order.status})`, order);
  }
  const a = unit?.shipping?.address ?? {};
  return {
    captureId: cap.id,
    amountMinor: Math.round(Number(cap.amount.value) * 100),
    currency: cap.amount.currency_code,
    payerEmail: order.payer?.email_address,
    shipTo: {
      name: unit?.shipping?.name?.full_name,
      line1: a.address_line_1,
      line2: a.address_line_2,
      city: a.admin_area_2,
      state: a.admin_area_1,
      postalCode: a.postal_code,
      country: a.country_code,
    },
  };
}

export async function addTracking(input: { captureId: string; trackingNumber: string; carrier: string }) {
  return call<unknown>("create_shipment_tracking", {
    transaction_id: input.captureId,
    tracking_number: input.trackingNumber,
    status: "SHIPPED",
    carrier: carrierCode(input.carrier),
  });
}

/** PayPal tracking wants carrier codes, not display names. */
export function carrierCode(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("dhl")) return "DHL";
  if (n.includes("fedex")) return "FEDEX";
  if (n.includes("ups")) return "UPS";
  if (n.includes("usps")) return "USPS";
  if (n.includes("royal mail")) return "ROYAL_MAIL";
  return "OTHER";
}

export async function listOpenDisputes() {
  return call<{ items?: unknown[] }>("list_disputes", {});
}
