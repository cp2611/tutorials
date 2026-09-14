import type { Metadata } from "next";
import { LegalPage } from "@/components/Legal";
import { BUSINESS } from "@/config/business";
import { EXCLUSIONS, LEAD_TIME_HOURS, OUTSTATION, SERVICE_CITIES } from "@/config/fares";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <h2>Who we are</h2>
      <p>
        {BUSINESS.brandName} is operated by {BUSINESS.legalEntityName}, {BUSINESS.address}. We are an
        aggregator: we arrange cabs through verified partner transport operators. The vehicle and
        driver on your trip are supplied by one of those operators.
      </p>

      <h2>Booking and confirmation</h2>
      <ul>
        <li>A booking is <strong>confirmed only after the advance is received and verified</strong> by us.</li>
        <li>
          Submitting a payment reference marks your booking as paid pending verification. We check it
          against our bank account, usually within a couple of hours during working time.
        </li>
        <li>
          Cab and driver details are shared within {BUSINESS.confirmationWindowHours} hours of
          confirmation, and in any case before pickup.
        </li>
        <li>
          Minimum notice is {LEAD_TIME_HOURS.local}–{LEAD_TIME_HOURS.outstation_round} hours depending
          on trip type. Pickups are currently offered from {SERVICE_CITIES.join(", ")}.
        </li>
        <li>
          If we cannot arrange a cab for your booking, we cancel it and refund the advance in full.
        </li>
      </ul>

      <h2>Fares</h2>
      <ul>
        <li>The fare shown at booking is what you pay us and the driver, in total, for the trip as booked.</li>
        <li>
          <strong>These are not included</strong> and are paid directly to the driver:{" "}
          {EXCLUSIONS.join(", ").toLowerCase()}.
        </li>
        <li>
          Outstation round trips are billed on a minimum of {OUTSTATION.roundTrip.minKmPerDay} km per
          day, both directions, plus a driver allowance per day. One-way drops bill only the distance
          travelled, with no driver allowance, subject to a {OUTSTATION.oneWay.minKm} km minimum.
        </li>
        <li>
          A driver allowance applies per day on outstation round trips, and a night charge applies to pickups
          between {OUTSTATION.nightChargeFromHour}:00 and 0{OUTSTATION.nightChargeToHour}:00.
        </li>
        <li>
          Changing the route, adding stops or exceeding the booked distance changes the fare. Extra
          distance is charged at the per-km rate for your cab type and settled with the driver.
        </li>
        <li>
          Where a fare was quoted on a distance you supplied, we confirm the exact fare with you before
          the trip. You may cancel for a full refund if the corrected fare does not suit you.
        </li>
        <li>
          Hourly and sightseeing packages bill on{" "}
          <strong>whichever you exceed by more — hours or kilometres, never both</strong>. A
          10-hour, 70 km day on an 8 hr / 80 km package is charged two extra hours; an 8-hour,
          100 km day is charged twenty extra kilometres. Extra rates are shown with your fare and
          are settled directly with the driver.
        </li>
        <li>
          Sightseeing packages include the car, the driver and the hours and kilometres stated.{" "}
          <strong>Monument entry tickets, ferry charges and guide fees are not included</strong> and
          are paid by you at each stop. Stops may be reordered or skipped on the day for traffic,
          closures or timings.
        </li>
      </ul>

      <h2>Payment</h2>
      <ul>
        <li>The advance is paid to us by UPI at the time of booking.</li>
        <li>The balance is paid in cash or UPI to the driver at the end of the trip.</li>
        <li>Pay the exact amount shown on your booking page. A different amount delays confirmation.</li>
      </ul>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Give an accurate pickup address and a reachable mobile number.</li>
        <li>Be ready at the pickup time. Waiting beyond 30 minutes may be charged by the driver.</li>
        <li>
          Smoking, alcohol and any illegal activity in the vehicle are not permitted. Any damage to the
          vehicle is recoverable from the passenger.
        </li>
        <li>Passenger and luggage limits for your cab type apply.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        Transport is performed by our partner operator. Our liability is limited to the amount you paid
        us. We are not liable for delays caused by traffic, weather, road closures, vehicle breakdown,
        or other events outside our control — though we will do our best to arrange a replacement.
      </p>

      <h2>Contact</h2>
      <p>
        {BUSINESS.phone} · {BUSINESS.email}
      </p>
    </LegalPage>
  );
}
