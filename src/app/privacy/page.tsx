import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – InvenStories",
  description: "How InvenStories collects, uses, and protects your data.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-light)" }}>
            Last updated: March 24, 2026
          </p>
          <div className="mt-4 h-px w-full" style={{ background: "var(--border)" }} />
        </div>

        <div className="prose-legal space-y-8" style={{ color: "var(--ink-mid)" }}>

          <section>
            <p className="leading-relaxed" style={{ color: "var(--ink)" }}>
              InvenStories is built on a simple belief: the stories behind your objects matter, and
              you deserve to keep them safe. This policy explains plainly what data we collect, why
              we collect it, and how we protect it. We will never sell your personal information or
              the memories you entrust to us.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              1. Who we are
            </h2>
            <p className="leading-relaxed">
              InvenStories is a personal inventory and memory-keeping app currently in public beta.
              It is operated as an independent project. If you have questions about this policy,
              contact us at{" "}
              <a
                href="mailto:privacy@invenstories.com"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                privacy@invenstories.com
              </a>
              .
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              2. What data we collect
            </h2>
            <p className="leading-relaxed mb-3">
              We only collect data that makes the service work for you.
            </p>
            <ul className="space-y-3 list-none pl-0">
              {[
                {
                  label: "Account information",
                  detail:
                    "Your email address and display name when you create an account, or your Google profile name and email if you sign in with Google.",
                },
                {
                  label: "Photos and images",
                  detail:
                    "Photos you take with the in-app camera or upload from your device to document inventory items.",
                },
                {
                  label: "Voice recordings and transcriptions",
                  detail:
                    "Audio recordings you make to capture stories about items. We transcribe these using an AI service and store both the audio and the resulting text.",
                },
                {
                  label: "Item data and stories",
                  detail:
                    "Descriptions, tags, categories, notes, and any written stories you attach to your inventory items.",
                },
                {
                  label: "Location data",
                  detail:
                    "Approximate location information you optionally attach to items (for the map view). We do not track your device location in the background.",
                },
                {
                  label: "Usage data",
                  detail:
                    "Basic technical information such as browser type and error logs, used solely to keep the service running smoothly. We do not use third-party analytics trackers.",
                },
              ].map(({ label, detail }) => (
                <li
                  key={label}
                  className="pl-4 border-l-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>
                    {label}:
                  </span>{" "}
                  {detail}
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              3. How we use your data
            </h2>
            <ul className="space-y-2 list-none pl-0">
              {[
                "To create and maintain your account and inventory.",
                "To transcribe voice recordings and generate AI-assisted item descriptions using our AI processing pipeline.",
                "To enable multi-user collaboration — sharing an inventory with people you explicitly invite.",
                "To display your items on the map view when you have attached location data.",
                "To send you service-related emails (e.g. password resets). We do not send marketing emails without your consent.",
                "To diagnose bugs and improve the service during the beta period.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 leading-relaxed">
              We do not sell your data, use it for advertising, or share it with third parties
              beyond what is necessary to operate the service (see Section 5).
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              4. Where your data is stored
            </h2>
            <p className="leading-relaxed">
              All data is stored on{" "}
              <span className="font-semibold" style={{ color: "var(--ink)" }}>
                Google Firebase / Google Cloud
              </span>{" "}
              infrastructure. This includes:
            </p>
            <ul className="mt-3 space-y-2 list-none pl-0">
              {[
                "Firebase Authentication — manages your login credentials.",
                "Cloud Firestore — stores your item data, stories, and metadata.",
                "Firebase Storage — stores your photos and voice recordings.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-relaxed">
              Google&apos;s infrastructure is subject to Google&apos;s own privacy and security
              standards. Data is stored in the United States by default. For more information, see
              the{" "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                Firebase Privacy and Security page
              </a>
              .
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              5. Who can access your data
            </h2>
            <ul className="space-y-2 list-none pl-0">
              {[
                "You — you have full access to all data in your account.",
                "Collaborators you invite — people you explicitly invite to a shared inventory can view and edit items in that inventory. They cannot access your other inventories or your account details.",
                "AI processing services — voice recordings and photos are processed by our AI pipeline (including transcription and image analysis) to generate item descriptions. These services process your data but do not store it beyond the immediate request.",
                "InvenStories operators — we may access data in aggregate or for specific accounts to diagnose technical issues, always with confidentiality.",
                "Legal requirements — we will disclose data if required by law or to protect the safety of users.",
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
              6. Your rights and choices
            </h2>
            <p className="leading-relaxed mb-3">
              You are in control of your data. You can:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Edit or delete any item, photo, voice recording, or story at any time from within the app.",
                "Request a full export of your data by emailing privacy@invenstories.com.",
                "Delete your account entirely — this permanently removes all your data from our systems. To request account deletion, email privacy@invenstories.com.",
                "Withdraw consent for AI processing by not using the voice recording or AI description features.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span style={{ color: "var(--gold)" }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-relaxed">
              Depending on your location, you may have additional rights under laws such as the
              GDPR (EU) or CCPA (California). Contact us at privacy@invenstories.com to exercise
              any of these rights.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              7. Cookies and local storage
            </h2>
            <p className="leading-relaxed">
              InvenStories does not use advertising cookies or third-party tracking cookies.
              Firebase Authentication uses browser local storage and session cookies to keep you
              logged in. These are strictly necessary for the app to function and cannot be
              disabled without logging you out.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              8. Children&apos;s privacy
            </h2>
            <p className="leading-relaxed">
              InvenStories is not directed at children under 13. We do not knowingly collect
              personal information from children under 13. If you believe a child has provided us
              with personal information, please contact us so we can delete it.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              9. Beta service notice
            </h2>
            <p className="leading-relaxed">
              InvenStories is currently in public beta. While we take data protection seriously,
              the service is still under active development. We recommend you keep copies of any
              irreplaceable content (such as transcriptions of important family stories) in
              addition to storing them here.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              10. Changes to this policy
            </h2>
            <p className="leading-relaxed">
              We may update this policy from time to time. If we make significant changes, we will
              notify you by email or by a notice within the app. The &quot;Last updated&quot; date
              at the top of this page reflects the most recent revision.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="font-serif font-bold text-lg mb-3" style={{ color: "var(--ink)" }}>
              11. Contact us
            </h2>
            <p className="leading-relaxed">
              If you have questions or concerns about this Privacy Policy or how we handle your
              data, please reach out:
            </p>
            <p className="mt-3 font-semibold" style={{ color: "var(--ink)" }}>
              Email:{" "}
              <a
                href="mailto:privacy@invenstories.com"
                className="font-normal underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                privacy@invenstories.com
              </a>
            </p>
          </section>

          {/* Divider */}
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--ink-light)" }}>
              Also see our{" "}
              <Link
                href="/terms"
                className="underline transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                Terms of Service
              </Link>
              .
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
