import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <h2>What we collect</h2>
      <ul>
        <li>Your name, mobile number and (if given) email address.</li>
        <li>Your trip details: pickup and drop addresses, dates, passenger count and any note you add.</li>
        <li>Your UPI reference number for the advance. We never see or store your UPI PIN, card or bank credentials.</li>
        <li>
          Basic campaign information about how you reached the site (for example, which advertisement
          you clicked), so we know which advertising works.
        </li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To arrange your cab and to let the driver find you.</li>
        <li>To confirm your payment and to issue refunds where they are due.</li>
        <li>To contact you about your booking.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We share the minimum needed with the partner transport operator assigned to your trip — your
        name, pickup and drop details, and your contact number once a cab is committed. We do not sell
        your data, and we do not share it with anyone else except where the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Booking records are retained for as long as needed for accounting and tax purposes, and then
        deleted. You can ask us to delete your personal details sooner where we are not legally
        required to keep them.
      </p>

      <h2>Your choices</h2>
      <p>
        Write to {BUSINESS.email} to see, correct or delete the personal information we hold about you,
        or to stop receiving offers from us. We respond within 30 days.
      </p>

      <h2>Contact</h2>
      <p>
        {BUSINESS.legalEntityName}, {BUSINESS.address} · {BUSINESS.phone} · {BUSINESS.email}
      </p>
    </LegalPage>
  );
}
