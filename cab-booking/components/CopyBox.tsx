"use client";

import { useState } from "react";

/** A pre-written message plus a one-tap copy — the admin panel's whole job is
 *  to turn a booking into something you can paste into WhatsApp in two seconds. */
export function CopyBox({
  title,
  text,
  hint,
  action,
}: {
  title: string;
  text: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="btn-secondary !px-3 !py-1.5 !text-xs">
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {action && (
            <a href={action.href} target="_blank" rel="noreferrer"
              className="btn-secondary !px-3 !py-1.5 !text-xs">
              {action.label}
            </a>
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-ink-700">
        {text}
      </pre>
    </div>
  );
}
