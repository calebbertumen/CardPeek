import { describe, expect, it } from "vitest";
import {
  canUserReceiveCollectorRefund,
  COLLECTOR_REFUND_WINDOW_MS,
} from "@/lib/billing/collector-refund-eligibility";

const base = {
  hasEverPurchasedCollector: true,
  hasUsedCollectorRefund: false,
  hasEverCanceledCollector: false,
  firstCollectorPurchaseAt: new Date("2026-01-01T12:00:00.000Z"),
  firstCollectorPaymentIntentId: "pi_first123",
};

describe("canUserReceiveCollectorRefund", () => {
  it("eligible within 5-day window", () => {
    const now = new Date(base.firstCollectorPurchaseAt!.getTime() + 2 * 24 * 60 * 60 * 1000);
    const r = canUserReceiveCollectorRefund(base, now);
    expect(r.eligible).toBe(true);
    expect(r.refundDeadline?.getTime()).toBe(
      base.firstCollectorPurchaseAt!.getTime() + COLLECTOR_REFUND_WINDOW_MS,
    );
  });

  it("not eligible after 5 days", () => {
    const now = new Date(base.firstCollectorPurchaseAt!.getTime() + COLLECTOR_REFUND_WINDOW_MS + 1000);
    const r = canUserReceiveCollectorRefund(base, now);
    expect(r.eligible).toBe(false);
  });

  it("not eligible if refund already used", () => {
    const r = canUserReceiveCollectorRefund({ ...base, hasUsedCollectorRefund: true }, new Date());
    expect(r.eligible).toBe(false);
  });

  it("not eligible after any prior cancellation lifecycle", () => {
    const r = canUserReceiveCollectorRefund({ ...base, hasEverCanceledCollector: true }, new Date());
    expect(r.eligible).toBe(false);
  });

  it("not eligible without payment intent", () => {
    const r = canUserReceiveCollectorRefund(
      { ...base, firstCollectorPaymentIntentId: null },
      new Date(base.firstCollectorPurchaseAt!.getTime() + 1000),
    );
    expect(r.eligible).toBe(false);
  });

});
