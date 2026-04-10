/** 5-day refund window from first Collector purchase timestamp (UTC-based wall clock). */
export const COLLECTOR_REFUND_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

export type CollectorRefundEligibilityInput = {
  hasEverPurchasedCollector: boolean;
  hasUsedCollectorRefund: boolean;
  hasEverCanceledCollector: boolean;
  firstCollectorPurchaseAt: Date | null;
  firstCollectorPaymentIntentId: string | null;
};

export type CollectorRefundEligibilityResult = {
  eligible: boolean;
  reason: string;
  refundDeadline: Date | null;
};

/**
 * Refund allowed only for the first-ever Collector lifecycle, within 5 days of first purchase,
 * using the stored first payment intent only (see product rules).
 */
export function canUserReceiveCollectorRefund(
  input: CollectorRefundEligibilityInput,
  now: Date = new Date(),
): CollectorRefundEligibilityResult {
  if (!input.hasEverPurchasedCollector) {
    return { eligible: false, reason: "No Collector purchase on file.", refundDeadline: null };
  }
  if (input.hasUsedCollectorRefund) {
    return { eligible: false, reason: "A refund has already been processed on this account.", refundDeadline: null };
  }
  if (input.hasEverCanceledCollector) {
    return {
      eligible: false,
      reason: "The first-subscription refund offer only applies once; it does not apply after a cancellation.",
      refundDeadline: null,
    };
  }
  if (!input.firstCollectorPurchaseAt) {
    return {
      eligible: false,
      reason: "First purchase date is missing; refunds are unavailable. Contact support if this is wrong.",
      refundDeadline: null,
    };
  }
  if (!input.firstCollectorPaymentIntentId?.trim()) {
    return {
      eligible: false,
      reason: "Original payment is not on file; we cannot issue a refund automatically.",
      refundDeadline: null,
    };
  }

  const deadline = new Date(input.firstCollectorPurchaseAt.getTime() + COLLECTOR_REFUND_WINDOW_MS);

  if (now.getTime() > deadline.getTime()) {
    return {
      eligible: false,
      reason: "The 5-day full-refund window from your first purchase has ended.",
      refundDeadline: deadline,
    };
  }

  return {
    eligible: true,
    reason: "Eligible for a full refund of your first Collector charge within 5 days of purchase.",
    refundDeadline: deadline,
  };
}
