# Cab booking site

A quick-booking cab website for a middleman operation: a paid ad click lands on
pricing, and can reach a created booking without a single page navigation. You
get the order on Telegram and email, verify the UPI advance by hand, and assign
a partner's cab from an admin panel.

Built for the stage before a payment gateway — everything here works with a
plain UPI ID, and swaps to a gateway later without a rewrite.

---

## How the money and the data actually flow

```
Ad click  →  /  (calculator + every cab priced)
                └─ name + phone  ──►  ORDER CREATED · YOU ARE ALERTED
                      │                 status: PENDING_PAYMENT
                      │                 ← the lead is captured HERE, before payment
                      └─ dynamic UPI QR (amount + booking ID pre-filled)
                            └─ customer enters UTR    → PAYMENT_CLAIMED
                                  └─ you match it in your bank  → CONFIRMED
                                        └─ you fill in driver details → ASSIGNED
                                              └─ customer sees them on /booking/<id>
```

Three deliberate choices are worth knowing before you change anything:

**The booking is saved and alerted before payment.** A customer who abandons at
the QR screen is still a named lead with a phone number and a full trip spec,
sitting in your admin panel under "Unpaid — call these back". Gating the record
behind payment would throw most of them away.

**A UTR is a claim, never a confirmation.** With no gateway there is no callback
to trust, so `PAYMENT_CLAIMED` and `CONFIRMED` are separate states and only you
can bridge them, after looking at your bank statement.

**The fare is frozen onto the order at booking time.** Editing `config/fares.ts`
changes what new customers are quoted and never rewrites what an existing
customer agreed to pay.

---

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

It starts with no configuration at all: orders go to `.data/orders.json` and
notifications are simply skipped. To open the admin panel locally:

```bash
ADMIN_PASSWORD=test123 ADMIN_SECRET=anything npm run dev
# then visit http://localhost:3000/admin
```

---

## Going live

### 1. Database (required)

Serverless filesystems are wiped on every deploy, so the file store is for local
work only. Create a free Postgres at [neon.tech](https://neon.tech) or
[supabase.com](https://supabase.com), copy the connection string, and set
`DATABASE_URL`. The table is created automatically on first use; run
`npm run init-db` if you want to confirm the connection before taking a booking.

### 2. Telegram alerts (5 minutes, free, no approvals)

1. Message **@BotFather** on Telegram, send `/newbot`, copy the token into `TELEGRAM_BOT_TOKEN`.
2. Send your new bot any message, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the `"chat":{"id":...}`
   number into `TELEGRAM_CHAT_ID`.

### 3. Email alerts

Sign up at [resend.com](https://resend.com), verify your domain, set
`RESEND_API_KEY` and `EMAIL_FROM`. Alerts to you go to `BUSINESS.email` in
`config/business.ts`; customers get their confirmation at the address they typed.

### 4. UPI

Set `UPI_ID` and `UPI_PAYEE_NAME`. **Use a merchant/business VPA, not your
personal UPI ID** — personal UPI has a ~₹1L/day P2P cap, gets flagged by banks
for high-volume inbound collections, creates an income-tax mess, and will not
support the amount-locking that makes the QR reliable.

Optionally set `UPI_UNIQUE_PAISE=true`. Each booking then gets a unique paise
value (₹1000.37, ₹1000.82 …) so your bank SMS identifies the booking from the
amount alone, with no gateway. Customers see an odd amount, which is the
trade-off. Leave it off until name collisions in your bank feed start costing
you time.

### 5. Admin password

Set `ADMIN_PASSWORD` (long) and `ADMIN_SECRET` (`openssl rand -base64 32`). The
admin panel holds customer names, phones and home addresses — leaving it open is
a personal-data breach, not just untidy.

### 6. Deploy

Push to GitHub, import the repo at [vercel.com](https://vercel.com), set the
**Root Directory** to `cab-booking`, paste the environment variables from
`.env.example`, and deploy. Point your domain at it and set
`NEXT_PUBLIC_SITE_URL` to the live URL.

### 7. Before you spend a rupee on ads

- Fill in every field in `config/business.ts` — the brand name, your real phone,
  your real address. The address is a hard requirement for payment-gateway
  approval later, and customers do check it.
- Replace the fares in `config/fares.ts` with your partner's actual rates plus
  your commission. The defaults are plausible North-India numbers, not yours.
- Set `SERVICE_CITIES` to the cities you can genuinely pick up from, and
  `ROUTES` to the destinations you actually sell.
- Have a lawyer read `/terms`, `/refund-policy` and `/privacy`, and a CA advise
  on GST for aggregator commission.
- Do one real ₹1 test booking end to end, including the bank check.

### 8. WhatsApp (later)

WhatsApp cannot send from a website without the Cloud API: a Meta Business
account, a verified number, and pre-approved message templates — typically one
to two weeks. The code is written and switched off. When your templates clear,
set `WHATSAPP_ENABLED=true` with your token and phone number ID.

Until then, the admin panel gives you a **Copy** button and an **Open WhatsApp**
link on every order with the message pre-written, which is about as fast by hand.

---

## Editing fares and settings

| File | What's in it |
|---|---|
| `config/business.ts` | Brand name, phone, email, address, UPI ID, refund windows |
| `config/fares.ts` | Cab types, per-km rates, airport zones, rental packages, routes, service cities, lead times, advance policy |

Both are plain numbers and text with comments. Edit, commit, push — Vercel
redeploys and prices change everywhere, including the terms page.

### How the advance is calculated

The advance should be **at least as large as your commission**, otherwise the
driver collects the difference and you spend your month invoicing partners for
it. `ADVANCE` in `config/fares.ts` handles this:

- `flat` — the target advance per trip type.
- `minPercentOfFare` — raises it on expensive trips, so a ₹45,000 multi-day
  booking doesn't ask for the same ₹1,500 as a ₹4,000 one.
- `maxPercentOfFare` — caps it, because customers balk at large sums up front.
- `floor` / `floorMaxPercentOfFare` — keeps small bookings meaningful without
  asking ₹500 on a ₹400 fare.

Current behaviour with the shipped defaults:

| Trip | Fare | Advance |
|---|---|---|
| Local drop, 5 km | ₹400 | ₹200 (50%) |
| Airport transfer | ₹1,200 | ₹350 (29%) |
| Delhi → Jaipur one-way | ₹3,940 | ₹1,000 (25%) |
| Delhi → Manali, 5 days, SUV | ₹23,250 | ₹2,300 (10%) |
| Delhi → Varanasi, 5 days, Tempo | ₹45,640 | ₹4,550 (10%) |

---

## Adding a payment gateway later

When you move to Razorpay or Cashfree, the only thing that changes is how an
order reaches `CONFIRMED`. Replace the UTR form in
`app/api/orders/[id]/payment/route.ts` with a signed webhook handler that sets
`status: "CONFIRMED"` and `paymentVerifiedAt`. Everything else — the order
model, the admin panel, the customer pages, the notifications — is untouched.

You will need `/terms`, `/refund-policy`, `/privacy` and `/contact` live with a
real address for the gateway's onboarding review. They already are.

---

## Routes

| Path | Who it's for |
|---|---|
| `/` | Ad landing page: calculator, pricing, checkout |
| `/booking/<id>` | Post-booking: UPI QR, UTR entry, status, driver details |
| `/track` | Look up a booking with ID **and** the matching phone number |
| `/admin` | Orders list, filtered by what needs doing |
| `/admin/orders/<id>` | Verify payment, assign a cab, copy partner and customer messages |
| `/terms`, `/refund-policy`, `/privacy`, `/contact` | Published policies |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Postgres · zod.
No paid maps API — outstation distances come from the measured `ROUTES` table,
with a customer-entered fallback that marks the quote provisional.
