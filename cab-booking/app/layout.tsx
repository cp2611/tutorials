import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BUSINESS } from "@/config/business";
import { UtmCatcher } from "@/components/UtmCatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.brandName} — Book a cab in 60 seconds`,
    template: `%s · ${BUSINESS.brandName}`,
  },
  description: `${BUSINESS.tagline}. Transparent fares, no hidden charges. Pay a small advance, settle the rest with the driver.`,
  metadataBase: new URL(BUSINESS.siteUrl),
  openGraph: {
    title: `${BUSINESS.brandName} — Book a cab in 60 seconds`,
    description: BUSINESS.tagline,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <UtmCatcher />
        <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-ink-900">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-sm text-white"
              >
                ⌁
              </span>
              <span className="text-[15px] sm:text-base">{BUSINESS.brandName}</span>
            </Link>
            <a
              href={`tel:${BUSINESS.phone}`}
              className="rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-accent-600"
            >
              📞 <span className="hidden sm:inline">{BUSINESS.phone}</span>
              <span className="sm:hidden">Call</span>
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">{children}</main>

        <footer className="border-t border-ink-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-500">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/track" className="hover:text-ink-900">Track booking</Link>
              <Link href="/terms" className="hover:text-ink-900">Terms</Link>
              <Link href="/refund-policy" className="hover:text-ink-900">Cancellation &amp; refunds</Link>
              <Link href="/privacy" className="hover:text-ink-900">Privacy</Link>
              <Link href="/contact" className="hover:text-ink-900">Contact</Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed">
              {BUSINESS.legalEntityName} · {BUSINESS.address}
              <br />
              {BUSINESS.brandName} arranges cabs through verified partner operators.
              Fares exclude tolls, parking and state permit charges, which are payable
              directly to the driver.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
