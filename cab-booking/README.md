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
                            └─ customer pays, then taps through to WhatsApp
                                  (booking number, trip and amount pre-filled)
                                  └─ you see the money in your account
                                        └─ you confirm in admin      → CONFIRMED
                                              └─ you fill in driver details → ASSIGNED
                                                    └─ customer sees them on /booking/<id>
```

Three deliberate choices are worth knowing before you change anything:

**The booking is saved and alerted before payment.** A customer who abandons at
the QR screen is still a named lead with a phone number and a full trip spec,
sitting in your admin panel under "Unpaid — call these back". Gating the record
behind payment would throw most of them away.

**Nothing but your own eyes confirms a payment.** There is no form where a
customer reports that they paid, because their word was never evidence and
collecting it still left you checking your bank. A booking leaves
`PENDING_PAYMENT` only when you mark the advance received in the admin panel.
Instead of a form, the customer is handed to WhatsApp with the booking
pre-filled — which works the same whether they have already paid or want to ask
something first, and puts the conversation where you were going to have it.

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
value (₹1000.37, ₹1000.82 …), so when two customers owe the same advance you can
still tell their payments apart in your bank statement. Customers see an odd
amount, which is the trade-off. Leave it off until look-alike amounts start
costing you time.

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

### 8. WhatsApp handoff

Set `whatsappNumber` in `config/business.ts` (digits only, country code first,
e.g. `919812345678`). That is all this needs — no API, no approvals, no signup.

Every WhatsApp link on the site is a plain `wa.me` link with the message
pre-written, so the customer taps once and sends, and the first thing you see is
who they are and what they booked:

- **Booking page, after the QR** — "I've paid" carries the booking number, name,
  route, pickup time and the exact advance.
- **Booking page, below that** — "Chat before paying", for someone who wants to
  ask about the fare or the route first.
- **Site header** — a general "I'd like to book a cab", available on every page.
- **Admin panel** — a partner brief and a customer message, both ready to copy.

### 9. WhatsApp (later)

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
| Local drop, 5 km | ₹450 | ₹200 (44%) |
| Airport ⇄ South Mumbai | ₹1,100 | ₹300 (27%) |
| Mumbai Darshan, full day | ₹3,000 | ₹750 (25%) |
| Mumbai → Pune, one-way drop | ₹2,800 | ₹800 (29%) |
| Mumbai → Goa, 5 days, Crysta | ₹27,000 | ₹2,700 (10%) |

---

## Mumbai setup, and the one number to check first

The site ships configured for Mumbai: pickups from Mumbai, Navi Mumbai, Thane
and Panvel; 26 measured outstation routes from Lonavala and Alibaug out to Goa
and Ahmedabad; six CSMIA airport zones; and three Mumbai Darshan packages.

**Sightseeing is its own trip type, not a relabelled hourly rental.** Mumbai
Darshan is a product people search for by name, so it has its own price and a
published stop list — Gateway of India, Marine Drive, Siddhivinayak, Haji Ali,
Hanging Gardens, Dhobi Ghat, the Sea Link, Juhu. The itinerary is what makes a
customer pick you over a site that just says "8 hours / 80 km". Entry tickets
and ferry charges are excluded, on the pricing page and in the terms.

### One-way drops are the risky ones

A round trip is easy to price: the car is with the customer the whole time. A
one-way drop is not, because the car still has to come back. Mumbai → Goa is
590 km charged and 1,180 km driven.

Two settings handle this, and you should set both from what your partner
actually tells you:

- `OUTSTATION.oneWayReturnFactor` (default `1.6`) multiplies the distance on
  any route without a flat rate. Push it toward `2` if your partner bills you
  the full return leg.
- `oneWayFlat` on a route in `ROUTES` overrides the formula completely. Use it
  on corridors like Mumbai–Pune where return loads are reliable and your
  partner quotes a fixed drop rate — the formula cannot know that, and without
  the override you would price as if the car returns empty and lose the
  booking to anyone quoting the real market rate.

**Before advertising, ask each partner one question per route: "what do you
charge me for this drop?"** Then check it against the break-even rate implied
by the quote. With the shipped placeholders, on a sedan:

| Route | You quote | km driven | Works if your partner charges |
|---|---|---|---|
| Mumbai → Pune | ₹2,800 | 300 | ≤ ₹9.33/km, allowance included |
| Mumbai → Lonavala | ₹2,100 | 166 | ≤ ₹12.65/km, allowance included |
| Mumbai → Alibaug | ₹2,300 | 200 | ≤ ₹11.50/km, allowance included |
| Mumbai → Shirdi | ₹5,290 | 480 | ≤ ₹10.40/km + ₹300 allowance |
| Mumbai → Goa | ₹12,570 | 1,180 | ≤ ₹10.40/km + ₹300 allowance |

Pune is the tight one, which is expected — that corridor is competitive and
only works on a flat rate with a return load. If your partner won't do it at
that number, raise `oneWayFlat` for Pune rather than dropping the route.

Road distances in `ROUTES` are approximate. Check the ones you actually sell:
at ₹13/km a 20 km error moves every quote by ₹260.

## Adding a payment gateway later

A gateway buys you three things this setup does not have: cards and netbanking
alongside UPI, a signed callback so confirmation stops being manual, and refunds
you don't process by hand. Expect roughly 2% MDR for that.

When you move to Razorpay or Cashfree, one thing changes: how an order reaches
`CONFIRMED`. Add a webhook route that verifies the gateway's signature and sets
`status: "CONFIRMED"` and `paymentVerifiedAt` — the same fields the admin
button sets today. Everything else — the order model, the admin panel, the
customer pages, the notifications — is untouched.

You will need `/terms`, `/refund-policy`, `/privacy` and `/contact` live with a
real address for the gateway's onboarding review. They already are.

---

## Routes

| Path | Who it's for |
|---|---|
| `/` | Ad landing page: calculator, pricing, checkout |
| `/booking/<id>` | Post-booking: UPI QR, WhatsApp handoff, status, driver details |
| `/track` | Look up a booking with ID **and** the matching phone number |
| `/admin` | Orders list, filtered by what needs doing |
| `/admin/orders/<id>` | Verify payment, assign a cab, copy partner and customer messages |
| `/terms`, `/refund-policy`, `/privacy`, `/contact` | Published policies |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Postgres · zod.
No paid maps API — outstation distances come from the measured `ROUTES` table,
with a customer-entered fallback that marks the quote provisional.
