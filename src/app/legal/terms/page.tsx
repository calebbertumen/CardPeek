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
      <p className="mt-2 text-sm text-muted-foreground">Effective Date: May 1, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CardPeek (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), you agree to be
            bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must not use
            the app.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p>CardPeek provides tools that allow users to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Search for trading card pricing data</li>
            <li>View recent marketplace sales data</li>
            <li>Access aggregated pricing insights and summaries</li>
            <li>Build and track a personal collection of trading cards</li>
          </ul>

          <div className="space-y-3 pt-1">
            <p>
              <strong className="text-foreground">Pricing Insights &amp; Market Data</strong>
            </p>
            <p>
              CardPeek retrieves and processes publicly available marketplace data (such as eBay sold listings) to
              generate pricing insights.
            </p>
            <p>These insights may include:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Estimated values</li>
              <li>Typical price ranges</li>
              <li>Observed lower and higher price points</li>
              <li>Summary statistics (e.g., median, low, high, sample size)</li>
            </ul>
            <p>These insights are:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Generated using internal data processing and selection methods</li>
              <li>Based on historical sold listings, not active listings</li>
              <li>Not real-time and may be delayed</li>
              <li>Derived from a subset of available listings, not all listings</li>
              <li>Influenced by condition, listing quality, relevance, and other factors</li>
            </ul>
            <p>CardPeek may:</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>
                Filter, rank, or select listings based on condition match, listing quality, and relevance
              </li>
              <li>Exclude listings that are incomplete, inconsistent, or not representative</li>
              <li>Use cached data across users for performance optimization</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">Important Disclosures</strong>
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>CardPeek does not provide financial, investment, or professional advice</li>
              <li>All pricing information is for informational purposes only</li>
              <li>Data may be incomplete, inaccurate, or outdated</li>
              <li>CardPeek does not guarantee pricing accuracy or market outcomes</li>
              <li>Estimates may differ from actual sale prices or marketplace listings</li>
              <li>
                CardPeek is not affiliated with, endorsed by, or sponsored by any marketplace (including eBay)
              </li>
            </ul>
            <p>
              Users are responsible for independently verifying information before making buying or selling decisions.
            </p>
          </div>

          <div className="space-y-3">
            <p>
              <strong className="text-foreground">Collection Feature</strong>
            </p>
            <p>CardPeek allows users to save and organize cards into a personal collection.</p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Users may add cards identified by card identity, condition, and quantity</li>
              <li>Collection values are calculated using cached and processed pricing data</li>
              <li>Pricing displayed in collections may not reflect current market conditions</li>
            </ul>
            <p>
              <strong className="text-foreground">Important notes:</strong>
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Free-tier users may experience delayed or limited pricing updates</li>
              <li>Paid users may receive refreshed pricing based on system rules</li>
              <li>Collection pricing uses the same estimation logic as search results</li>
              <li>Collections are private and not shared publicly</li>
            </ul>
            <p>
              We reserve the right to modify how collection values are calculated or displayed at any time.
            </p>
          </div>
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
          <p>Certain features require a paid subscription.</p>
          <p>All payments are processed securely through Stripe.</p>

          <div className="space-y-3 pt-1">
            <p>
              <strong className="text-foreground">a. Billing and Auto-Renewal</strong>
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>Subscriptions are billed in advance on a recurring basis</li>
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
              <li>Attempts to circumvent feature limitations</li>
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
            <li>Use bots, scraping tools, or automation to abuse the service</li>
            <li>Circumvent feature limitations, including subscription or usage restrictions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Data and Accuracy Disclaimer</h2>
          <p>CardPeek aggregates and processes data from third-party sources.</p>
          <p>We do not guarantee:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Accuracy</li>
            <li>Completeness</li>
            <li>Timeliness</li>
            <li>That all relevant listings are captured</li>
          </ul>
          <p>All pricing insights:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Are derived estimates based on selected and processed data</li>
            <li>May vary significantly due to condition, timing, listing quality, and market demand</li>
            <li>May be based on a limited sample of listings</li>
            <li>Should not be relied upon as financial or investment advice</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Platform Changes and Data Processing</h2>
          <p>CardPeek may:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Modify how pricing insights are calculated, selected, or displayed</li>
            <li>Change data sources or processing methods</li>
            <li>Adjust selection logic, filtering rules, or condition matching</li>
            <li>Cache and reuse data across users</li>
          </ul>
          <p>We do not guarantee consistency of outputs over time.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Intellectual Property</h2>
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
          <h2 className="text-lg font-semibold text-foreground">9. Third-Party Services</h2>
          <p>CardPeek relies on third-party services, including:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Stripe (payments and billing)</li>
            <li>External marketplace data providers</li>
          </ul>
          <p>We are not responsible for:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Third-party outages</li>
            <li>External data accuracy</li>
            <li>Third-party policies or practices</li>
          </ul>
          <p>Use of third-party services is subject to their respective terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
          <p>We may suspend or terminate your access at any time, without notice, if you:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Violate these Terms</li>
            <li>Abuse the platform</li>
            <li>Engage in harmful or fraudulent behavior</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, CardPeek is not liable for:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Financial losses</li>
            <li>Missed opportunities</li>
            <li>Decisions made based on app data</li>
            <li>Inaccurate, delayed, or incomplete information</li>
            <li>Variability in pricing insights or market conditions</li>
            <li>Service interruptions</li>
          </ul>
          <p>Your use of the service is at your own risk.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Disclaimer of Warranties</h2>
          <p>
            The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind.
          </p>
          <p>We do not guarantee that:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>The service will be uninterrupted or error-free</li>
            <li>The data will be accurate, reliable, or current</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">13. Changes to Terms</h2>
          <p>We may update these Terms at any time.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Updates will be posted with a revised &ldquo;Effective Date&rdquo;</li>
            <li>Continued use of the app constitutes acceptance of the updated Terms</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">14. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, United States.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">15. Contact</h2>
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
