"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ActivityFeed } from "@/components/ActivityFeed";
import { Notice } from "@/components/Notice";
import { formatMoney, getJson } from "@/lib/client";
import type { DeskAccount, DeskMeta } from "@/lib/types";

export function Overview() {
  const [account, setAccount] = useState<DeskAccount | null>(null);
  const [meta, setMeta] = useState<DeskMeta | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<{ account: DeskAccount }>("/api/account")
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setAccountMessage(result.message);
          return;
        }
        setAccount(result.account);
      })
      .catch(() => {
        if (!cancelled) setAccountMessage("Could not load the Breet account.");
      });
    getJson<DeskMeta>("/api/meta")
      .then((result) => {
        if (!cancelled && result.ok) setMeta(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const usd = account?.fiatWallets.find((wallet) => wallet.currency === "USD");
  const ngn = account?.fiatWallets.find((wallet) => wallet.currency === "NGN");

  return (
    <div className="stack">
      <section className="grid-3">
        <article className="panel">
          <p className="eyebrow">USD balance</p>
          <p className="stat-value">{usd ? formatMoney(usd.balance, "USD") : "—"}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">NGN balance</p>
          <p className="stat-value">{ngn ? formatMoney(ngn.balance, "NGN") : "—"}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Environment</p>
          <p className="stat-value">{meta?.env ?? "sandbox"}</p>
          <p className="quiet">
            {account?.merchantReference ? account.merchantReference : "api.breet.io/v1"}
          </p>
        </article>
      </section>
      {accountMessage ? <Notice tone="error">{accountMessage}</Notice> : null}
      <section className="grid-2">
        <Link href="/buy" className="panel link-card">
          <p className="eyebrow">Buy</p>
          <h2>Send USDT / USDC</h2>
          <p className="quiet">Withdraw stablecoins from the Breet USD balance to an external wallet.</p>
        </Link>
        <Link href="/sell" className="panel link-card">
          <p className="eyebrow">Sell</p>
          <h2>Open a deposit address</h2>
          <p className="quiet">Pick a token and network, then generate a Breet deposit address.</p>
        </Link>
      </section>
      <section className="panel">
        <h2>Recent activity</h2>
        <ActivityFeed limit={5} />
      </section>
    </div>
  );
}
