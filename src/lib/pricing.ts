// Code-owned pricing and haggling. The AI may pass the buyer's offer in; only this
// module decides what price Oja agrees to. The floor is never revealed unless it
// becomes the final price.

import { assertMinor, roundDownTo, roundUpTo } from "./money";

export type QtyTier = { minQty: number; unitPriceMinor: number };

export type PricedProduct = {
  listPriceMinor: number;
  minPriceMinor: number;
  /** Group/bulk tiers (aso-ebi). Sorted or not; we sort. */
  tiers?: QtyTier[];
};

export type Playbook = {
  /** Counters before Oja holds at its final price. */
  maxRounds: number;
  /** Share of the gap Oja gives up per counter (0..1). */
  concession: number;
  /** Accept if the buyer is within this share of list price of our ask. */
  acceptGapPct: number;
  /** Loyalty discount for returning buyers, 0..1. */
  loyaltyDiscount: number;
  /** Prices are rounded to this step, in minor units. */
  priceStepMinor: number;
};

export const DEFAULT_PLAYBOOK: Playbook = {
  maxRounds: 3,
  concession: 0.5,
  acceptGapPct: 0.02,
  loyaltyDiscount: 0,
  priceStepMinor: 100,
};

/** Unit price for a quantity, before haggling. Tier prices never go below the floor. */
export function unitPriceFor(p: PricedProduct, qty: number, opts: { returning?: boolean; playbook?: Playbook } = {}): number {
  if (!Number.isInteger(qty) || qty < 1) throw new Error(`qty must be a positive integer, got ${qty}`);
  assertMinor(p.listPriceMinor, "listPriceMinor");
  assertMinor(p.minPriceMinor, "minPriceMinor");
  const pb = opts.playbook ?? DEFAULT_PLAYBOOK;
  let unit = p.listPriceMinor;
  for (const t of [...(p.tiers ?? [])].sort((a, b) => a.minQty - b.minQty)) {
    if (qty >= t.minQty) unit = Math.min(unit, t.unitPriceMinor);
  }
  if (opts.returning && pb.loyaltyDiscount > 0) {
    unit = roundUpTo(Math.round(unit * (1 - pb.loyaltyDiscount)), pb.priceStepMinor);
  }
  return Math.max(unit, p.minPriceMinor);
}

export type OfferInput = {
  product: PricedProduct;
  qty: number;
  /** Buyer's offered unit price; undefined = "what's your last price?" */
  offerMinor?: number;
  /** Oja's previous counters for this product in this conversation, oldest first. */
  previousCounters: number[];
  returning?: boolean;
  playbook?: Playbook;
};

export type OfferDecision =
  | { decision: "accept"; unitPriceMinor: number; final: boolean }
  | { decision: "counter"; unitPriceMinor: number; final: boolean; round: number };

export function evaluateOffer(input: OfferInput): OfferDecision {
  const pb = input.playbook ?? DEFAULT_PLAYBOOK;
  const floor = input.product.minPriceMinor;
  const start = unitPriceFor(input.product, input.qty, { returning: input.returning, playbook: pb });
  const lastAsk = input.previousCounters.length
    ? Math.min(start, ...input.previousCounters)
    : start;
  const round = input.previousCounters.length + 1;
  const offer = input.offerMinor;
  if (offer !== undefined) assertMinor(offer, "offerMinor");

  // Buyer meets or beats our current ask: take our ask, not more.
  if (offer !== undefined && offer >= lastAsk) {
    return { decision: "accept", unitPriceMinor: lastAsk, final: true };
  }

  const atFloor = lastAsk <= floor;
  const outOfRounds = round > pb.maxRounds;

  if (offer !== undefined && offer >= floor) {
    const gap = lastAsk - offer;
    if (outOfRounds || atFloor || gap <= Math.round(input.product.listPriceMinor * pb.acceptGapPct)) {
      return { decision: "accept", unitPriceMinor: roundUpTo(offer, 1), final: true };
    }
  }

  if (atFloor || outOfRounds) {
    return { decision: "counter", unitPriceMinor: Math.max(lastAsk, floor), final: true, round };
  }

  // Move toward the buyer (or toward the floor if they gave no number / lowballed).
  const target = Math.max(offer ?? floor, floor);
  let next = lastAsk - Math.round((lastAsk - target) * pb.concession);
  next = roundDownTo(next, pb.priceStepMinor);
  if (next < floor) next = floor;
  if (next >= lastAsk) next = Math.max(floor, lastAsk - pb.priceStepMinor);
  const final = next === floor || round === pb.maxRounds;
  return { decision: "counter", unitPriceMinor: next, final, round };
}
