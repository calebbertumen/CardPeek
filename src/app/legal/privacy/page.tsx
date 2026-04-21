import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
};

const CONTACT_EMAIL = "calebbertumen99@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective Date: April 21, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
          <p>
            Welcome to CardPeek (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We respect your privacy and
            are committed to protecting your personal information. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <p>
            <strong className="text-foreground">a. Personal Information</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Email address</li>
            <li>Account login credentials (if applicable)</li>
          </ul>
          <p>
            <strong className="text-foreground">b. Usage Data</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Search queries (e.g., cards you look up)</li>
            <li>Collection data (cards you add, condition selections, quantities)</li>
            <li>Saved preferences and interactions (features used, pages visited, timestamps)</li>
            <li>Device and browser information (e.g., IP address, device type)</li>
          </ul>
          <p>
            <strong className="text-foreground">c. Payment Information</strong>
          </p>
          <p>
            All payments are processed securely through Stripe. We do not store or have access to full payment details
            such as credit card numbers. We may store:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Stripe customer ID</li>
            <li>Subscription status</li>
            <li>Billing-related metadata (e.g., plan type, renewal status)</li>
          </ul>
          <p>
            <strong className="text-foreground">d. Market Data, Pricing Insights, and External Data Sources</strong>
          </p>
          <p>
            CardPeek retrieves and processes publicly available marketplace data (e.g., eBay sold listings). This data
            is used to generate pricing insights, including but not limited to:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Estimated market values</li>
            <li>Typical price ranges</li>
            <li>Lower-end and higher-end observed price points</li>
            <li>Summary statistics (e.g., median, high, low, sample size)</li>
          </ul>
          <p>
            <strong className="text-foreground">Important notes about this data:</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Data is aggregated, transformed, and interpreted using internal algorithms</li>
            <li>Data may be cached and reused across users for performance optimization</li>
            <li>Pricing insights are not real-time and may be delayed</li>
            <li>
              Data may be incomplete, inconsistent, or affected by listing quality, condition, or market volatility
            </li>
            <li>Outputs are estimates only and do not represent guaranteed or definitive market values</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Provide, operate, and maintain the app</li>
            <li>Enable collection features (saving, organizing, and displaying your card collection)</li>
            <li>Calculate and display collection value using cached and processed pricing data</li>
            <li>Generate pricing insights and market summaries</li>
            <li>Process subscriptions and manage billing</li>
            <li>Send transactional notifications (e.g., billing updates)</li>
            <li>Improve app functionality, performance, and user experience</li>
            <li>Monitor usage trends and prevent fraud or abuse</li>
            <li>Enforce our Terms of Service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Pricing Insights &amp; Informational Use</h2>
          <p>CardPeek provides pricing insights for informational purposes only.</p>
          <p>These insights:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Are based on recent sold listing data and internal calculations</li>
            <li>May vary significantly due to condition, timing, market demand, and data variability</li>
            <li>Should not be relied upon as financial, investment, or professional advice</li>
          </ul>
          <p>
            Users are responsible for performing their own due diligence before making buying or selling decisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Collection Feature Data</h2>
          <p>When you use the Collection feature:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Cards you add are stored as part of your account</li>
            <li>This may include card identity, condition, and quantity</li>
            <li>Collection values are calculated using cached pricing data</li>
          </ul>
          <p>
            <strong className="text-foreground">Important notes:</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Pricing shown in your collection may not reflect the most recent market activity</li>
            <li>Free-tier users may see delayed or limited pricing data</li>
            <li>Paid users may receive more frequently refreshed pricing based on system rules</li>
            <li>Your collection is private and not visible to other users</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Data Sharing</h2>
          <p>We do not sell your personal data.</p>
          <p>We may share your information with:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Service providers (e.g., hosting, infrastructure, analytics)</li>
            <li>Stripe for payment processing and billing</li>
            <li>Third-party APIs or data providers used to retrieve marketplace data</li>
            <li>Legal authorities, if required by law or to protect our rights</li>
          </ul>
          <p>All third parties are expected to handle data securely and in accordance with applicable laws.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Subscriptions, Billing, and Refunds</h2>
          <p>CardPeek offers paid subscription plans.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Subscriptions may renew automatically unless canceled</li>
            <li>Billing is handled securely through Stripe</li>
            <li>Users can manage or cancel subscriptions at any time</li>
          </ul>
          <p>
            <strong className="text-foreground">Refund Policy (Summary)</strong>
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>A 5-day refund window applies to first-time subscription purchases only</li>
            <li>Refund requests must be made within 5 days of the initial purchase</li>
            <li>
              Refunds are not available:
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>After 5 days</li>
                <li>For renewals</li>
                <li>For re-subscriptions or plan changes</li>
              </ul>
            </li>
            <li>Each user is eligible for one refund only</li>
          </ul>
          <p>If a refund is issued:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>The subscription will be canceled immediately</li>
            <li>Access to premium features will be revoked immediately</li>
          </ul>
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
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Data Storage and Security</h2>
          <p>
            We implement reasonable administrative, technical, and organizational safeguards to protect your information.
            However:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>No system is 100% secure</li>
            <li>We cannot guarantee absolute security</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Data Retention</h2>
          <p>We retain data only as long as necessary to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Provide our services</li>
            <li>Maintain system performance (e.g., cached pricing data)</li>
            <li>Improve pricing models and aggregation accuracy</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes and enforce agreements</li>
          </ul>
          <p>You may request deletion of your account and associated data at any time.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Your Rights</h2>
          <p>Depending on your location (e.g., California, EU), you may have rights including:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Access to your personal data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
            <li>Restriction or objection to processing</li>
            <li>Data portability</li>
          </ul>
          <p>
            To exercise these rights, contact:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">11. Cookies and Tracking Technologies</h2>
          <p>We may use cookies or similar technologies to:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Maintain user sessions</li>
            <li>Analyze usage and performance</li>
            <li>Improve user experience</li>
          </ul>
          <p>You can control cookies through your browser settings.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">12. Third-Party Services</h2>
          <p>We use third-party services such as:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Stripe (payments and billing)</li>
            <li>Hosting providers</li>
            <li>Analytics tools (if applicable)</li>
          </ul>
          <p>These services have their own privacy policies. We encourage you to review them.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">13. Children&apos;s Privacy</h2>
          <p>CardPeek is not intended for individuals under 13 years old.</p>
          <p>We do not knowingly collect personal information from children.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">14. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time.</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>Updates will be posted on this page</li>
            <li>The &ldquo;Effective Date&rdquo; will be updated accordingly</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">15. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy:{" "}
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
          <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-4">
            Refund policy
          </Link>
        </p>
      </div>
    </div>
  );
}
