import { promises as fs } from "node:fs";
import path from "node:path";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * Storage adapter.
 *
 * With DATABASE_URL set (Neon/Supabase/any Postgres) orders go to Postgres.
 * Without it, they go to .data/orders.json so `npm run dev` works immediately
 * with no signups. The file store is for local testing only — serverless
 * filesystems are ephemeral, so production MUST have DATABASE_URL.
 *
 * The schema keeps the full order in a JSONB `data` column with only the
 * columns we actually filter on promoted alongside it. Adding a field to an
 * order therefore never needs a migration.
 */

const DATABASE_URL = process.env.DATABASE_URL;
export const usingPostgres = Boolean(DATABASE_URL);

/* ------------------------------------------------------------------ Postgres */

type Sql = import("postgres").Sql;
let sqlPromise: Promise<Sql> | null = null;

async function getSql(): Promise<Sql> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { default: postgres } = await import("postgres");
      const sql = postgres(DATABASE_URL!, {
        // Serverless: keep the pool tiny and don't hold connections open.
        max: 3,
        idle_timeout: 20,
        connect_timeout: 15,
        // Neon and friends require TLS; `prepare:false` keeps pooled mode happy.
        prepare: false,
      });
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
      return sql;
    })();
  }
  return sqlPromise;
}

/* ----------------------------------------------------------------- File store */

const FILE = path.join(process.cwd(), ".data", "orders.json");

async function readFileStore(): Promise<Order[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Order[];
  } catch {
    return [];
  }
}

async function writeFileStore(orders: Order[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(orders, null, 2), "utf8");
}

/* -------------------------------------------------------------- Public API */

export async function insertOrder(order: Order): Promise<void> {
  if (usingPostgres) {
    const sql = await getSql();
    await sql`
      insert into orders (id, created_at, updated_at, status, customer_phone, pickup_at, data)
      values (
        ${order.id}, ${order.createdAt}, ${order.updatedAt}, ${order.status},
        ${order.customerPhone}, ${order.pickupAt ?? null}, ${sql.json(order as never)}
      )
    `;
    return;
  }
  const all = await readFileStore();
  all.unshift(order);
  await writeFileStore(all);
}

export async function getOrder(id: string): Promise<Order | null> {
  if (usingPostgres) {
    const sql = await getSql();
    const rows = await sql<{ data: Order }[]>`select data from orders where id = ${id}`;
    return rows[0]?.data ?? null;
  }
  const all = await readFileStore();
  return all.find((o) => o.id === id) ?? null;
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>,
): Promise<Order | null> {
  const existing = await getOrder(id);
  if (!existing) return null;
  const next: Order = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };

  if (usingPostgres) {
    const sql = await getSql();
    await sql`
      update orders set
        updated_at = ${next.updatedAt},
        status = ${next.status},
        customer_phone = ${next.customerPhone},
        pickup_at = ${next.pickupAt ?? null},
        data = ${sql.json(next as never)}
      where id = ${id}
    `;
    return next;
  }
  const all = await readFileStore();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  all[idx] = next;
  await writeFileStore(all);
  return next;
}

export async function listOrders(opts: {
  status?: OrderStatus | "ALL";
  search?: string;
  limit?: number;
} = {}): Promise<Order[]> {
  const limit = Math.min(opts.limit ?? 200, 500);
  let rows: Order[];

  if (usingPostgres) {
    const sql = await getSql();
    const result =
      opts.status && opts.status !== "ALL"
        ? await sql<{ data: Order }[]>`
            select data from orders where status = ${opts.status}
            order by created_at desc limit ${limit}`
        : await sql<{ data: Order }[]>`
            select data from orders order by created_at desc limit ${limit}`;
    rows = result.map((r) => r.data);
  } else {
    const all = await readFileStore();
    rows = all
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((o) => !opts.status || opts.status === "ALL" || o.status === opts.status)
      .slice(0, limit);
  }

  const q = opts.search?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (o) =>
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.paymentReference ?? "").toLowerCase().includes(q),
  );
}

/** Recent orders from the same phone — used to block accidental double-booking. */
export async function recentOrdersByPhone(phone: string, withinMinutes: number): Promise<Order[]> {
  const cutoff = Date.now() - withinMinutes * 60_000;
  if (usingPostgres) {
    const sql = await getSql();
    const rows = await sql<{ data: Order }[]>`
      select data from orders
      where customer_phone = ${phone} and created_at > ${new Date(cutoff).toISOString()}
      order by created_at desc limit 10`;
    return rows.map((r) => r.data);
  }
  const all = await readFileStore();
  return all.filter(
    (o) => o.customerPhone === phone && new Date(o.createdAt).getTime() > cutoff,
  );
}
