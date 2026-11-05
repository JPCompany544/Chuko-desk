"use client";

import { useEffect, useState } from "react";

import { Notice } from "@/components/Notice";
import { formatWhen, getJson } from "@/lib/client";
import type { ActivityItem, ActivityKind } from "@/lib/types";

const FILTERS: { id: "all" | ActivityKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buy", label: "Buys" },
  { id: "sell", label: "Sells" },
  { id: "payout", label: "Payouts" },
];

export function ActivityFeed({ limit }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  useEffect(() => {
    let cancelled = false;
    getJson<{ items: ActivityItem[] }>("/api/activity")
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setMessage(result.message);
          setItems([]);
          return;
        }
        setItems(result.items);
        setMessage(null);
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not load activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items
    .filter((item) => filter === "all" || item.kind === filter)
    .slice(0, limit ?? items.length);

  return (
    <section>
      {limit ? null : (
        <div className="filters" role="tablist" aria-label="Activity filter">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="btn btn-ghost"
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}
      {loading ? <p className="quiet">Loading activity…</p> : null}
      {message ? <Notice tone="error">{message}</Notice> : null}
      {!loading && !message && visible.length === 0 ? (
        <p className="quiet">No sandbox trades yet. A buy or a mocked sell will show up here.</p>
      ) : null}
      <div className="feed">
        {visible.map((item) => (
          <article key={item.id} className="feed-row">
            <span className={`pill ${item.kind}`}>{item.kind}</span>
            <div>
              <p className="feed-title">{item.title}</p>
              <p className="feed-sub">
                {item.subtitle}
                {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
                {` · ${item.status}`}
              </p>
            </div>
            <p className="feed-amount">
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.amount}
                </a>
              ) : (
                item.amount
              )}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
