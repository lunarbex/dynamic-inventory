import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t mt-auto py-6 px-4"
      style={{ borderColor: "var(--border)", background: "var(--parchment-light)" }}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--ink-light)" }}>
          © {new Date().getFullYear()} InvenStories · Public Beta
        </p>
        <nav className="flex items-center gap-5">
  <a
    href="mailto:hello@invenstories.app"
    className="text-xs transition-opacity hover:opacity-75"
    style={{ color: "var(--ink-light)" }}
  >
    Contact
  </a>
  <Link
    href="/privacy"
    ...        </nav>
      </div>
    </footer>
  );
}
