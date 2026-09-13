import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";
import { BUSINESS } from "@/config/business";
import { SERVICE_CITIES } from "@/config/fares";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact us">
      <h2>{BUSINESS.legalEntityName}</h2>
      <p>{BUSINESS.address}</p>

      <h2>Talk to us</h2>
      <ul>
        <li>
          Phone / WhatsApp:{" "}
          <a href={`tel:${BUSINESS.phone}`} className="font-medium text-brand-600 underline">
            {BUSINESS.phone}
          </a>
        </li>
        <li>
          Email:{" "}
          <a href={`mailto:${BUSINESS.email}`} className="font-medium text-brand-600 underline">
            {BUSINESS.email}
          </a>
        </li>
      </ul>

      <h2>Where we operate</h2>
      <p>
        Pickups from {SERVICE_CITIES.join(", ")}, with drops across North India. Travelling from
        somewhere else? Call us — we can often arrange it.
      </p>

      <h2>Existing booking</h2>
      <p>
        Have your booking number ready (it looks like <strong>CAB4F7K2M</strong>), or look it up on the{" "}
        <a href="/track" className="font-medium text-brand-600 underline">track booking</a> page.
      </p>
    </LegalPage>
  );
}
