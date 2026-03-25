import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – InvenStories",
  description: "The terms that govern your use of InvenStories.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm font-semibold transition-opacity hover:opacity-75 mb-6 inline-block"
            style={{ color: "var(--gold)" }}
          >
            ← Back to InvenStories
          </Link>
          <h1
            className="font-serif font-bold mt-4"
            style={{ fontSize: "2rem", color: "var(--ink)" }}
          >
            Terms of Service
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-light)" }}>
            Last updated: March 24, 2026
          </p>
          <div className="mt-4 h-px w-full" style={{ background: "var(--border)" }} />
        </div>

        <div className="space-y-8" style={{ color: "var(--ink-mid)" }}>

          <section>
            <p className="leading-relaxed" style={{ color: "var(--ink)" }}>
              Welcome to InvenStories. These Terms of Service (&quot;Terms&quot;) describe the
              rules for using our app. They&apos;re written to be readable — please take a few
              minutes to go through them. By creating an account or using InvenStories, you agree
              to these Terms.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              1. What InvenStories is
            </h2>
            <p className="leading-relaxed">
              InvenStories is a personal inventory and memory-keeping tool. It lets you document
              your belongings — furniture, heirlooms, collections, everyday objects — with photos,
              voice recordings, written stories, and location data. You can share inventories with
              family members or collaborators you trust. The service uses AI to help transcribe
              voice recordings and generate item descriptions.
            </p>
            <p className="mt-3 leading-relaxed">
              InvenStories is currently in{" "}
              <span className="font-semibold" style={{ color: "var(--ink)" }}>
                public beta
              </span>
              . That means features are still being developed, and the service may change
              significantly. See Section 8 for what that means for you.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              2. Your account
            </h2>
            <ul className="space-y-2 list-none pl-0">
              {[
                "You must be at least 13 years old to use InvenStories.",
                "You are responsible for keeping your account credentials secure. Do not share your password.",
                "You are responsible for all activity that occurs under your account.",
                "You must provide accurate information when creating your account.",
                "One person may maintain one account. Creating multiple accounts to circumvent restrictions is not permitted.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              3. Your content — you own it
            </h2>
            <p className="leading-relaxed">
              Everything you upload or create in InvenStories — photos, voice recordings,
              written stories, item descriptions, tags — belongs to you.{" "}
              <span className="font-semibold" style={{ color: "var(--ink)" }}>
                We will never claim ownership of your content.
              </span>
            </p>
            <p className="mt-3 leading-relaxed">
              By using InvenStories, you grant us a limited licence to store, process, and display
              your content solely for the purpose of providing the service to you and the
              collaborators you invite. This licence ends when you delete your content or your
              account.
            </p>
            <p className="mt-3 leading-relaxed">
              You are responsible for the content you upload. Please only upload content you have
              the right to share.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              4. Acceptable use
            </h2>
            <p className="leading-relaxed mb-3">
              InvenStories is designed for personal and family memory-keeping. You agree not to:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Upload content that is illegal, harmful, threatening, obscene, or violates others' rights.",
                "Use InvenStories to store or distribute content that infringes intellectual property rights.",
                "Attempt to gain unauthorized access to other users' accounts or data.",
                "Use automated tools to scrape, extract, or excessively query the service.",
                "Resell, sublicence, or commercially exploit the service without written permission.",
                "Use the service in any way that disrupts or damages it for other users.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              5. Collaborators and shared inventories
            </h2>
            <p className="leading-relaxed">
              You can invite other people to collaborate on your inventories. When you do:
            </p>
            <ul className="mt-3 space-y-2 list-none pl-0">
              {[
                "Collaborators can view and edit items in the shared inventory.",
                "You are responsible for who you invite. Only share with people you trust.",
                "Collaborators are also subject to these Terms and must use the service appropriately.",
                "You can remove a collaborator at any time from your inventory settings.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              6. What we provide
            </h2>
            <p className="leading-relaxed mb-3">We commit to:</p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Making InvenStories available for your personal use.",
                "Protecting your data in accordance with our Privacy Policy.",
                "Giving you reasonable notice before making changes that significantly affect how the service works.",
                "Providing a way to export or delete your data (see Privacy Policy, Section 6).",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-relaxed">
              The service is provided &quot;as is.&quot; We do our best to keep it reliable and
              secure, but we cannot guarantee uninterrupted access, especially during the beta
              period.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              7. Intellectual property
            </h2>
            <p className="leading-relaxed">
              The InvenStories name, logo, design, and software code are owned by InvenStories
              and protected by intellectual property law. These Terms do not grant you any right
              to use them beyond what is necessary to use the service normally.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2
              className="font-serif font-bold text-lg mb-3"
              style={{ color: "var(--ink)" }}
            >
              8. Beta disclaimer
            </h2>
            <p className="leading-relaxed">
              InvenStories is in active development. This means:
            </p>
            <ul className="mt-3 space-y-2 list-none pl-0">
              {[
                "Features may change, be added, or be removed without prior notice.",
                "The service may occasionally be unavailable for maintenance or due to unexpected issues.",
                "Data migration between versions is our priority, but we recommend keeping backups of irreplaceable content.",
                "Pricing (if any) may be introduced in the future. We will provide advance notice before any free features become paid.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              9. Account termination
            </h2>
            <p className="leading-relaxed mb-3">
              <span className="font-semibold" style={{ color: "var(--ink)" }}>By you:</span>{" "}
              You can stop using InvenStories and delete your account at any time by emailing{" "}
              <a
                href="mailto:privacy@invenstories.com"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                privacy@invenstories.com
              </a>
              . Deleting your account permanently removes your data.
            </p>
            <p className="leading-relaxed">
              <span className="font-semibold" style={{ color: "var(--ink)" }}>By us:</span>{" "}
              We may suspend or terminate accounts that violate these Terms, particularly the
              acceptable use rules in Section 4. We will attempt to give notice before doing so
              unless the violation requires immediate action to protect the service or other users.
              If your account is terminated in error, please contact us.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              10. Limitation of liability
            </h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by applicable law, InvenStories is not liable for
              any indirect, incidental, special, consequential, or punitive damages arising from
              your use of — or inability to use — the service. This includes loss of data, loss of
              profit, or loss of goodwill.
            </p>
            <p className="mt-3 leading-relaxed">
              Our total liability for any claim arising from these Terms or your use of the service
              will not exceed the amount you paid us in the twelve months preceding the claim (or
              $10 if you have paid nothing, as is typical during beta).
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              11. Dispute resolution
            </h2>
            <p className="leading-relaxed">
              If you have a dispute with InvenStories, please contact us first at{" "}
              <a
                href="mailto:hello@invenstories.app"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                hello@invenstories.app
              </a>{" "}
              and we will do our best to resolve it informally.
            </p>
            <p className="mt-3 leading-relaxed">
              These Terms are governed by the laws of the United States. Any disputes that cannot
              be resolved informally will be subject to binding individual arbitration, not class
              actions, except where prohibited by applicable law.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              12. Changes to these Terms
            </h2>
            <p className="leading-relaxed">
              We may update these Terms from time to time. If we make material changes, we will
              notify you by email or with a notice in the app at least 14 days before the changes
              take effect. Continued use of InvenStories after that date constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              13. Contact
            </h2>
            <p className="leading-relaxed">
              Questions about these Terms? Reach us at:
            </p>
            <p className="mt-3 font-semibold" style={{ color: "var(--ink)" }}>
              Email:{" "}
              <a
                href="mailto:hello@invenstories.app"
                className="font-normal underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                hello@invenstories.app
              </a>
            </p>
          </section>

          {/* Divider */}
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ink-light)" }}>
              Also see our{" "}
              <Link
                href="/privacy"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
