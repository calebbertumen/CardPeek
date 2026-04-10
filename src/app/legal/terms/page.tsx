import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
};

const CONTACT_EMAIL = "calebbertumen99@gmail.com";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective Date: April 10, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CardPeek (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), you agree to be
            bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must not use
            the app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p>CardPeek provides tools that allow users to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Search for trading card pricing data</li>
            <li>View recent sales data</li>
            <li>Access pricing insights based on marketplace activity</li>
          </ul>
          <p>
            <strong className="text-foreground">Important Disclosures</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>CardPeek does not provide real-time data</li>
            <li>Data is collected and updated periodically</li>
            <li>Information may be delayed, incomplete, or inaccurate</li>
            <li>
              CardPeek is an independent tool and is not affiliated with, endorsed by, or sponsored by any marketplace
              (including eBay)
            </li>
            <li>
              Users should independently verify all information before making purchasing or financial decisions.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Accounts</h2>
          <p>To access certain features, you may be required to create an account.</p>
          <p>You agree to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Provide accurate and current information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Be responsible for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">4. Subscriptions, Billing, and Refunds</h2>
          <p>Certain features require a paid subscription. All payments are processed securely through Stripe.</p>

          <div className="space-y-3 pt-1">
            <p>
              <strong className="text-foreground">a. Billing and Auto-Renewal</strong>
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Subscriptions are billed in advance on a recurring basis (e.g., monthly)</li>
              <li>Subscriptions automatically renew unless canceled before the next billing date</li>
              <li>By subscribing, you authorize us to charge your payment method via Stripe</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">b. Cancellation</strong>
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>You may cancel your subscription at any time through your account or billing portal</li>
              <li>
                After cancellation, access continues until the end of the current billing period (unless refunded)
              </li>
              <li>You will not be charged for future billing cycles after cancellation</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">c. Refund Policy</strong>
            </p>
            <p>CardPeek offers a limited refund policy:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>A full refund may be requested within five (5) days of the initial subscription purchase only</li>
              <li>Refund eligibility is limited to one refund per user</li>
            </ul>
            <p>Refunds are not available for:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Requests after the 5-day window</li>
              <li>Subscription renewals</li>
              <li>Re-subscriptions after cancellation</li>
              <li>Plan changes, upgrades, or downgrades</li>
              <li>Partial billing periods or unused time</li>
            </ul>
            <p>If a refund is issued:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>The subscription will be canceled immediately</li>
              <li>Access to premium features will be revoked immediately</li>
            </ul>
            <p>We reserve the right to deny refunds in cases of:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Abuse of the refund system</li>
              <li>Attempts to circumvent limitations</li>
              <li>Violations of these Terms</li>
            </ul>
            <p>Refunds may also be issued where required by law or in cases of verified billing errors.</p>
            <p>
              For full details, refer to our{" "}
              <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-4">
                Refund &amp; Cancellation Policy
              </Link>
              .
            </p>
            <p>
              Contact:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">d. Price Changes</strong>
            </p>
            <p>We reserve the right to modify subscription pricing at any time.</p>
            <p>Users will be notified in advance of any changes.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Use the app for unlawful purposes</li>
            <li>Attempt to reverse engineer, copy, or exploit the platform</li>
            <li>Interfere with system performance or security</li>
            <li>Use bots, scripts, or automation to abuse the service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Data and Accuracy Disclaimer</h2>
          <p>CardPeek aggregates data from third-party sources.</p>
          <p>We do not guarantee:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Accuracy</li>
            <li>Completeness</li>
            <li>Timeliness</li>
            <li>That all relevant listings are captured</li>
          </ul>
          <p>
            Data is provided for informational purposes only and should not be relied upon as financial or investment
            advice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
          <p>
            All content, features, design, and functionality of CardPeek are owned by us and protected by intellectual
            property laws.
          </p>
          <p>You may not:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Copy</li>
            <li>Distribute</li>
            <li>Reproduce</li>
            <li>Reverse engineer</li>
          </ul>
          <p>any part of the service without prior written permission.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Third-Party Services</h2>
          <p>CardPeek relies on third-party services (including Stripe and external data providers).</p>
          <p>We are not responsible for:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Third-party outages</li>
            <li>External data accuracy</li>
            <li>Third-party policies or practices</li>
          </ul>
          <p>Use of third-party services is subject to their respective terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
          <p>We may suspend or terminate your access at any time, without notice, if you:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Violate these Terms</li>
            <li>Abuse the platform</li>
            <li>Engage in harmful or fraudulent behavior</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, CardPeek is not liable for:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Financial losses</li>
            <li>Missed opportunities</li>
            <li>Decisions made based on app data</li>
            <li>Inaccurate or delayed information</li>
            <li>Service interruptions</li>
          </ul>
          <p>Your use of the service is at your own risk.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Disclaimer of Warranties</h2>
          <p>
            The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind.
          </p>
          <p>We do not guarantee that:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>The service will be uninterrupted or error-free</li>
            <li>The data will be accurate or reliable</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Changes to Terms</h2>
          <p>We may update these Terms at any time.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Updates will be posted with a revised &ldquo;Effective Date&rdquo;</li>
            <li>Continued use of the app constitutes acceptance of the updated Terms</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">13. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, United States.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">14. Contact</h2>
          <p>
            If you have questions about these Terms:{" "}
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
          <Link href="/legal/privacy" className="font-medium text-foreground underline underline-offset-4">
            Privacy policy
          </Link>
          {" · "}
          <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-4">
            Refund policy
          </Link>
        </p>
      </div>
    </div>
  );
}
