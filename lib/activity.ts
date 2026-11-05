import type { ActivityItem, ActivityKind } from "@/lib/types";

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function money(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "USD" ? 2 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

function shortAddress(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function stamp(value: unknown): string | null {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return null;
  return raw;
}

export function mapDeposits(data: unknown): ActivityItem[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => {
    const row = record(entry);
    const id = text(row.id);
    if (!id) return [];
    const currency = (text(row.currency) ?? "USD").toUpperCase();
    const received = num(row.amountReceived);
    const crypto = text(row.cryptoReceived);
    const address = text(row.address);
    const txHash = text(row.txHash);
    const amount =
      received !== null
        ? money(received, currency)
        : crypto
          ? `${crypto} crypto`
          : "Deposit";
    const subtitle = [address ? shortAddress(address) : null, txHash ? shortAddress(txHash) : null]
      .filter(Boolean)
      .join(" · ");
    return [
      {
        id: `sell-${id}`,
        kind: "sell" as const,
        status: text(row.status) ?? "unknown",
        title: "Sell deposit",
        subtitle: subtitle || "Incoming crypto",
        amount,
        createdAt: stamp(row.createdAt),
        href: text(row.txLink),
      },
    ];
  });
}

export function mapWithdrawals(data: unknown): ActivityItem[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => {
    const row = record(entry);
    const id = text(row.id);
    if (!id) return [];
    const meta = record(row.meta);
    const currency = (text(row.currency) ?? "USD").toUpperCase();
    const amountValue = num(row.amount);
    const token = text(meta.token);
    const network = text(meta.network);
    const wallet = text(meta.walletAddress);
    const bank = text(meta.bankName);
    const account = text(meta.accountNumber);
    const crypto = meta.type === "address" || Boolean(token);
    const kind: ActivityKind = crypto ? "buy" : "payout";
    const title = crypto
      ? [token, network].filter(Boolean).join(" · ") || "Stablecoin withdrawal"
      : bank || "Fiat payout";
    const subtitle = crypto
      ? [wallet ? shortAddress(wallet) : null, text(row.externalId)].filter(Boolean).join(" · ")
      : [account ? shortAddress(account) : null, text(meta.narration)].filter(Boolean).join(" · ");
    return [
      {
        id: `${kind}-${id}`,
        kind,
        status: text(row.status) ?? "unknown",
        title,
        subtitle: subtitle || "Withdrawal",
        amount: amountValue !== null ? money(amountValue, currency) : currency,
        createdAt: stamp(row.createdAt),
        href: null,
      },
    ];
  });
}

export function mergeActivity(deposits: ActivityItem[], withdrawals: ActivityItem[]): ActivityItem[] {
  return [...deposits, ...withdrawals].sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0;
    const right = b.createdAt ? Date.parse(b.createdAt) : 0;
    return right - left;
  });
}
