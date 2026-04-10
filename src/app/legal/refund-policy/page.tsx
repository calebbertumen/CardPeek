import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & cancellation policy",
};

const CONTACT_EMAIL = "calebbertumen99@gmail.com";

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective Date: April 10, 2026</p>
      <p className="mt-1 text-sm text-muted-foreground">
        <strong className="text-foreground">Product:</strong> CardPeek
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Overview</h2>
          <p>
            This Refund &amp; Cancellation Policy explains how refunds and subscription cancellations are handled for
            CardPeek&apos;s paid &ldquo;Collector&rdquo; subscription tier.
          </p>
          <p>By purchasing a subscription, you agree to this policy.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. 5-Day Refund Policy (First Purchase Only)</h2>
          <p>
            We offer a full refund within five (5) days of your first-ever purchase of the Collector subscription.
          </p>
          <p>
            <strong className="text-foreground">Eligibility Requirements</strong>
          </p>
          <p>To qualify for a refund:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>The request must be made within 5 days of the initial purchase date</li>
            <li>This must be your first purchase of the Collector subscription</li>
            <li>You must not have previously received a refund for this subscription</li>
          </ul>
          <p>
            <strong className="text-foreground">If Eligible</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>A full refund will be issued to the original payment method</li>
            <li>Your subscription will be canceled immediately</li>
            <li>Access to Collector features will be revoked immediately</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. No Refunds After 5 Days</h2>
          <p>If a subscription is canceled after the 5-day refund window, no refund will be issued.</p>
          <p>However:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Your subscription will remain active until the end of the current billing period</li>
            <li>You will not be charged again after cancellation</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Renewals Are Non-Refundable</h2>
          <p>All subscription renewals are final and non-refundable.</p>
          <p>The 5-day refund policy applies only to the first purchase, and does not apply to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Subscription renewals</li>
            <li>Re-subscriptions after cancellation</li>
            <li>Plan changes, upgrades, or downgrades</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. One-Time Refund Limitation</h2>
          <p>
            Each user is eligible for one (1) refund only, tied to their first Collector subscription purchase. If you
            cancel and later re-subscribe:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>You will not be eligible for another refund</li>
            <li>All future purchases are considered final</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. How to Cancel</h2>
          <p>You may cancel your subscription at any time through your account or billing settings.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>
              If canceled within 5 days of first purchase → eligible users receive a full refund and immediate
              cancellation
            </li>
            <li>If canceled after 5 days → subscription remains active until the end of the billing cycle</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Refund Processing</h2>
          <p>Approved refunds will be issued to the original payment method used at checkout.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Processing times may vary depending on your payment provider</li>
            <li>Most refunds are completed within 5–10 business days</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Chargebacks and Disputes</h2>
          <p>
            Before initiating a chargeback or dispute with your payment provider, please contact us first at:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>Filing a chargeback without first contacting us may delay resolution and may result in:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Immediate suspension or termination of your account</li>
            <li>Loss of access to the service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Abuse &amp; Fraud Prevention</h2>
          <p>We reserve the right to deny refunds in cases of:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Abuse of the refund policy</li>
            <li>Multiple account creation to bypass refund limits</li>
            <li>Excessive or suspicious refund behavior</li>
            <li>Violations of our Terms of Service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Legal Exceptions</h2>
          <p>Nothing in this policy limits your rights under applicable consumer protection laws.</p>
          <p>Refunds may be granted where required by law.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Changes to This Policy</h2>
          <p>We may update this policy from time to time.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Changes will be posted with an updated &ldquo;Effective Date&rdquo;</li>
            <li>Continued use of the service constitutes acceptance of the updated policy</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
          <p>If you have questions about this policy:</p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <p className="pt-4 text-xs">
          Related:{" "}
          <Link href="/legal/terms" className="font-medium text-foreground underline underline-offset-4">
            Terms of service
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="font-medium text-foreground underline underline-offset-4">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
