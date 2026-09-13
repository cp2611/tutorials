/**
 * Creates the orders table. You normally never need to run this — the app
 * creates the table on its first database call. It exists so you can verify
 * that DATABASE_URL actually works before taking a real booking.
 *
 *   node --experimental-strip-types scripts/init-db.ts
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local or your shell.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

await sql`
  create table if not exists orders (
    id            text primary key,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    status        text not null,
    customer_phone text not null,
    pickup_at     timestamptz,
    data          jsonb not null
  )
`;
await sql`create index if not exists orders_created_at_idx on orders (created_at desc)`;
await sql`create index if not exists orders_status_idx on orders (status)`;
await sql`create index if not exists orders_phone_idx on orders (customer_phone)`;

const [{ count }] = await sql<{ count: string }[]>`select count(*)::text as count from orders`;
console.log(`✓ orders table ready — ${count} row(s) currently stored.`);
await sql.end();
