"use client";

import { useState } from "react";
import { ETRANSFER_EMAIL } from "@/lib/site";

/**
 * The whole of how you take a place: send the e-transfer. It appears twice on
 * the page — once beside the form so nobody registers without knowing what is
 * being asked of them, and once after they have registered — so it says the
 * same thing in both places.
 */
export function PaymentPanel({ feeNote }: { feeNote: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ETRANSFER_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the address is on the page to be read anyway.
    }
  }

  return (
    <div className="border border-brass bg-paper p-6 sm:p-8">
      <p className="rubric">Interac e-transfer</p>
      <p className="mt-3 max-w-prose font-display text-2xl leading-snug">
        Your place is held the moment the transfer arrives. There is no invoice
        to wait for and nothing else to send.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <code className="font-mono text-lg break-all text-ink">
          {ETRANSFER_EMAIL}
        </code>
        <button type="button" onClick={copy} className="btn btn-quiet">
          {copied ? "Copied" : "Copy address"}
        </button>
      </div>

      <dl className="mt-7 divide-y divide-line border-y border-line">
        {feeNote ? (
          <div className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr]">
            <dt className="field-label pt-1">How much</dt>
            <dd>{feeNote}</dd>
          </div>
        ) : null}
        <div className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr]">
          <dt className="field-label pt-1">Message</dt>
          <dd>
            Put your full name in the transfer message, so we can match it to
            your registration.
          </dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr]">
          <dt className="field-label pt-1">Then</dt>
          <dd>
            We message you on WhatsApp with the schedule and the Zoom link. If
            your bank asks for a security question, send us the answer there
            too.
          </dd>
        </div>
      </dl>
    </div>
  );
}
