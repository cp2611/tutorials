import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <form method="post" action="/api/admin/login" className="card grid gap-4 p-6">
        <h1 className="text-lg font-bold text-ink-900">Admin sign in</h1>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required autoFocus
            autoComplete="current-password" />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Incorrect password.
          </p>
        )}
        <button type="submit" className="btn-primary">Sign in</button>
      </form>
    </div>
  );
}
