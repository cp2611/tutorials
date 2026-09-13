import Link from "next/link";
import { BUSINESS } from "@/config/business";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-bold text-ink-900">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-sm text-ink-600">
        If you were looking for a booking, try the track page — you&apos;ll need your booking number
        and mobile. Or just call us at{" "}
        <a href={`tel:${BUSINESS.phone}`} className="font-medium text-brand-600 underline">
          {BUSINESS.phone}
        </a>
        .
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/" className="btn-secondary">Book a cab</Link>
        <Link href="/track" className="btn-secondary">Track a booking</Link>
      </div>
    </div>
  );
}
