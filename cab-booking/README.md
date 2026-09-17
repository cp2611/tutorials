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
notifications are simply skipped.

The admin panel is the one page that needs a value, because it holds customer
names, phones and addresses and is never left open. Create a file called
`.env.local` inside `cab-booking/`:

```
ADMIN_PASSWORD=test123
ADMIN_SECRET=any-long-random-string
```

Then restart (`Ctrl+C`, `npm run dev`) — Next.js reads `.env.local` at startup,
not per request — and visit http://localhost:3000/admin. Without it the login
replies `ADMIN_PASSWORD is not set`, which is the panel refusing to unlock
rather than a bug.

A `.env.local` works the same on macOS, Linux and Windows. Creating it from a
terminal avoids Explorer or Finder silently appending `.txt`:

```bash
# macOS / Linux
printf 'ADMIN_PASSWORD=test123\nADMIN_SECRET=any-long-random-string\n' > .env.local
```
```powershell
# Windows PowerShell
"ADMIN_PASSWORD=test123`nADMIN_SECRET=any-long-random-string" | Set-Content .env.local
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
| `config/fares.ts` | Eight car models with their own rates, airport zones, tour and rental packages, routes, service cities, lead times, advance policy |

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
| Airport ⇄ South Mumbai | ₹880 | ₹250 (28%) |
| Mumbai Darshan, 14 hrs / 140 km | ₹3,300 | ₹990 (30%) |
| Mumbai → Pune, one-way drop | ₹2,300 | ₹650 (28%) |
| Mumbai → Goa, 5 days, Crysta | ₹24,500 | ₹2,450 (10%) |

---

## Where these prices come from

The fares in `config/fares.ts` are set from a survey of what Mumbai operators
publicly advertise, done in September 2026. Sources at the bottom of this
section. **They are what you can charge. What you pay your partner is a
different number you must get from them before advertising.**

### Rates sit at the midpoint of the surveyed range

Not the floor. Undercutting a teaser price you cannot sustain wins bookings you
lose money on; the middle leaves room to discount by hand when a customer
haggles on WhatsApp, which they will.

| Route / product (Dzire) | Market range | This site |
|---|---|---|
| Mumbai → Pune, one way | ₹1,834–2,800 | ₹2,300 |
| Mumbai → Lonavala, one way | ₹1,399–2,500 | ₹1,950 |
| Mumbai → Alibaug, one way | ₹2,300–3,500 | ₹2,900 |
| Mumbai → Shirdi, one way | ₹2,849–3,100 | ₹3,000 |
| Mumbai → Mahabaleshwar, one way | ₹3,200–3,954 | ₹3,600 |
| Mumbai → Goa, one way | ₹7,061–10,703 | ₹8,900 |
| Airport ⇄ South Mumbai | ₹750–900 | ₹880 |
| Mumbai Darshan, 8 hrs / 80 km (market shape) | ₹1,800–2,400 | — |
| Mumbai Darshan, 14 hrs / 140 km (ours) | — | ₹3,300 |
| Local rental, 8 hrs / 80 km | ₹2,000–3,000 | ₹2,400 |

### Pricing by car model, not by category

Eight models, because that is how the market quotes and how customers shop —
somebody who wants an Innova will not accept "SUV", and the gap between an
Ertiga and a Crysta is ₹4/km.

| Model | Seats | One-way | Round trip | Local | Extra hr | Extra km |
|---|---|---|---|---|---|---|
| Hatchback — Wagon R, Celerio | 4 | ₹11/km | ₹10/km | ₹14/km | ₹150 | ₹11 |
| Swift Dzire — Amaze, Xcent | 4 | ₹13/km | ₹11/km | ₹17/km | ₹175 | ₹13 |
| Toyota Etios — Honda City | 4 | ₹14/km | ₹12/km | ₹18/km | ₹175 | ₹14 |
| Ertiga — Rumion, Carens | 6 | ₹15/km | ₹14/km | ₹21/km | ₹200 | ₹15 |
| Innova | 6 | ₹17/km | ₹16/km | ₹24/km | ₹200 | ₹16 |
| Innova Crysta | 6 | ₹19/km | ₹18/km | ₹27/km | ₹250 | ₹18 |
| Tempo Traveller 12str | 12 | ₹24/km | ₹22/km | ₹34/km | ₹350 | ₹24 |
| Force Urbania 16str | 16 | ₹28/km | ₹26/km | ₹40/km | ₹450 | ₹28 |

Published cards for comparison: Dzire/Etios ₹12–13/km, Ertiga ₹13–15, Innova
₹16–18, Crysta ₹18–20, Tempo Traveller ₹22–30.

Flat prices on the six featured routes are set from the surveyed midpoint for a
Dzire and scaled across this ladder, so the model spread stays consistent
whichever route a customer looks at.

### Mumbai Darshan: a published running order, priced as a full day

Sightseeing is its own trip type, not a relabelled hourly rental. Darshan is a
product people search for by name, so it carries a **timed running order** —
fourteen stops from Siddhivinayak at 8 AM through to Juhu at 10 PM. A customer
can picture the whole day before paying, which is what makes them pick you over
a site that says only "8 hours / 80 km". Times are labelled as shifting with
the actual pickup, because the customer chooses that.

The package is priced as the **14-hour day it actually is** — ₹3,300 for a
Dzire, derived from the package's own overage rates. The market sells an 8 hr /
80 km Darshan at ₹1,800–2,400, so this is a bigger product at a bigger price,
not an overcharge. Selling this itinerary at the 8-hour price would end every
booking at midnight with six hours of overage and an argument — exactly what
publishing the rates is meant to prevent.

Half day (5 hrs) and Mumbai by Night (4 hrs) carry their own shorter orders.

### The driver's number is held back until pickup is close

Vehicle details — model and number plate — go out the moment a cab is assigned,
because that is what reassures someone who has already paid. The driver's
personal number waits until roughly two hours before pickup.

A customer and a driver holding each other's numbers a week early is how the
next trip gets arranged without you. `driverContactHoursBefore` in
`config/business.ts` sets the window, and the booking page, the track page, the
assignment email and the terms all read that one value — so the published
promise cannot drift from what the site does.

### One-way and round trip are different products

Not the same product with a discount:

| | One-way drop | Round trip |
|---|---|---|
| Distance billed | one way only | both directions |
| Minimum | 130 km | 250 km per day |
| Driver allowance | none | per day |
| Dzire rate | ₹13/km | ₹11/km |

It is tempting to bill a one-way drop for the driver's empty return — the car
really does drive back. Don't. Every aggregator sells one-way as "pay only for
the distance you travel", and it is the cheaper product precisely because you
skip the return leg and the driver's overnight. Billing the return puts you
60–80% above the market on the same route, which is a rate nobody pays. Your
margin on a drop comes from buying below these rates, not from charging more.

### Packages: the "whichever is higher" rule

Local and sightseeing hire is sold as a block of hours **and** kilometres — the
standard being 8 hrs / 80 km. Going past either is chargeable, and the industry
rule is that you bill **whichever is exceeded by more, never both**:

- 10 hours, 70 km on an 8/80 package → two extra hours
- 8 hours, 100 km → twenty extra km
- 10 hours, 100 km → the larger of the two, not the sum

The site does **not** quote overage at booking, because nobody knows it yet. It
publishes the rule and that model's rates alongside the fare, and the driver
settles the difference at the end. The written rule is what prevents the
argument.

### Night charge

Pickups between 22:00 and 06:00 carry a flat night charge, ₹200–500 by model.
Operators publish either a flat figure or a 10–25% surcharge; flat is used here
because it survives being read aloud over the phone. It applies to every trip
type, not just outstation.

### Driver allowance, tolls and taxes

Driver allowance ₹300–600 per day by model, round trips only. Tolls ₹500–2,000
per route and state permit ₹200–500 per state are charged at actual — which is
why they appear as exclusions on every quote and in the terms, per trip type.

### Service area and what "26 routes" actually means

Pickups from **Mumbai and Thane**. That list is the only real restriction on
the site: a pickup outside it is refused, because you cannot service it.

Cities are toggled in `SERVICE_CITY_OPTIONS`, not deleted — Navi Mumbai,
Panvel, Kalyan and Vasai-Virar are listed there with `enabled: false` and each
is a one-word edit away from being live again when you have partner coverage
for it. The dropdown, the quote API and the booking API all read the same
derived list, so a disabled city is refused at every layer, not just hidden in
the form.

Destinations are **not** restricted. The 26 entries in `ROUTES` are
pre-measured so those destinations quote instantly and exactly; anywhere else
still books — the customer enters the approximate distance and the quote is
flagged provisional until you confirm it. Mumbai to Hyderabad works today.

Distances are measured from Mumbai. A Thane pickup quotes off the same number
and says so, rather than asking the customer to measure it themselves — a quote
a few kilometres out beats a form that demands homework.

| | |
|---|---|
| **Day trip** | Karjat 65 · Khandala 80 · **Lonavala 83** · Matheran 85 · **Alibaug 100** · Igatpuri 120 |
| **Overnight** | **Pune 150** · Nashik 165 · Murud 165 · Silvassa 165 · Diveagar 170 · Daman 175 · Trimbakeshwar 180 · Lavasa 200 · Bhimashankar 215 · **Shirdi 240** · Panchgani 245 · **Mahabaleshwar 250** |
| **Weekend** | Surat 285 · Ratnagiri 330 · Aurangabad 335 · Ganpatipule 355 · Kolhapur 385 |
| **Long haul** | Tarkarli 520 · Ahmedabad 525 · **Goa 590** |

**Bold** routes are the six in `FEATURED_ROUTES` — they get a one-tap tile on
the landing page and a hand-set flat price instead of the per-km formula. The
other twenty are priced by formula and still bookable; they simply do not have
a tile.

### Abuse protection, without an OTP

No OTP on booking: every extra step costs real bookings from a paid ad click,
and the goal is to keep junk out of your inbox and load off the server, not to
prove identity. Six layers instead, all invisible to a real customer:

| Layer | What it stops |
|---|---|
| 5 bookings per IP per hour | Someone holding down submit to bury your real leads |
| 5 bookings per phone per day | The same, by someone rotating their IP |
| 120 quotes per IP per 10 min | Scraping your whole fare table |
| Minimum 4-second form fill | Scripts, which post instantly |
| Hidden honeypot field | Bots that fill every input they find |
| Fake-number and link-spam checks | 9999999999, sequential digits, URLs in the notes box |

Counters live in Postgres, not memory, because Vercel runs many short-lived
instances — an in-memory counter resets on every cold start, handing an
attacker a fresh allowance each time. If the database is unreachable the
limiter **fails open**: a hiccup must never stop real customers booking.

Rejections are deliberately vague ("we couldn't accept that booking, please
call us") so a script learns nothing about which rule it tripped, and a real
person who gets caught still has a way to reach you.

Vercel also sits in front of all of this with its own platform-level DDoS
protection, so this layer only has to handle the nuisance traffic that gets
through.

### Three places the market will bite you

**Airport transfers are close to unwinnable on price.** The MIAL prepaid booth
does Bandra for ₹350–450, and a customer already standing in arrivals has it
right there. You cannot beat that. What you can sell is being pre-booked,
waiting, and known — so treat airport runs as a way to acquire a customer for
their next outstation trip, not as a margin line.

**Mumbai → Pune is the most contested route in the state.** Gozo advertises
₹1,834, Uber around ₹2,447, MakeMyTrip ₹1,882. At ₹2,200 you are mid-pack and
must win on answering the phone, not on price.

**"Starting from" prices are not prices.** Almost every figure above is a
teaser for the smallest car on the slowest day. Aggregator fares also surge
2–3× on weekends and holidays, which fixed-rate operators explicitly market
against. Your fixed price is a genuine advantage on a long weekend — say so in
the ad copy rather than trying to undercut a teaser.

### Before you advertise

Road distances in `ROUTES` are approximate and operator listings disagree
(Shirdi appears as both 240 km and 291 km depending on route). Check the ones
you will actually sell.

Then ask each partner, per route: **"what do you charge me for this drop?"**
Subtract it from the table above. If the gap is not worth your time, either
raise the route's `oneWayFlat` and compete on service, or drop the route.

Sources: [CabBazar route pages and rate guide](https://cabbazar.com/blog/how-much-does-an-outstation-cab-cost-in-india/),
[Gozo Cabs](https://www.gozocabs.com/book-taxi/mumbai-pune),
[Uber Intercity](https://www.uber.com/in/en/r/intercity/mumbai-maharashtra-to-pune-maharashtra),
[MakeMyTrip](https://www.makemytrip.com/car-rental/mumbai-shirdi-cab-services.html),
[Savaari](https://www.savaari.com/mumbai/mumbai-to-mahabaleshwar-cabs),
[TaxiBazaar Mumbai airport guide](https://www.taxibazaar.in/mumbai-airport-taxi-guide.php),
[Pravasi Cab Mumbai fares](https://pravasicab.com/taxi-fare-in-mumbai),
[Payal Cab local packages](https://www.payalcab.in/mumbai-local-full-day-taxi.php),
[Citycabz Mumbai Darshan](https://citycabz.com/mumbai-darshan-cab/),
[RoundTripCab Mumbai Darshan](https://www.roundtripcab.com/mumbai-darshan-cab-booking/).

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
