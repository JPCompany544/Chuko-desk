import type { StableToken } from "@/lib/types";

export const BUY_NETWORKS: Record<StableToken, readonly string[]> = {
  USDT: ["ERC20", "TRC20", "BSC", "SOL", "TON"],
  USDC: ["ERC20", "TRC20", "BSC", "SOL", "BASE"],
};

const WALLET_RE = /^[a-zA-Z0-9:_-]{8,256}$/;
const LABEL_RE = /^[\w .@-]{1,64}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ASSET_RE = /^[A-Za-z0-9_]{2,64}$/;

export type BuyInput = {
  token: StableToken;
  network: string;
  amount: number;
  walletAddress: string;
};

export type AddressInput = {
  assetId: string;
  label: string;
};

export type MockTradeInput = {
  walletAddress: string;
  asset: string;
  amountInUSD: number;
  cryptoReceived: number;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parsePositiveDecimal(value: unknown, scale: number): number | null {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const fraction = raw.split(".")[1] ?? "";
  if (fraction.length > scale) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function parseBuyInput(body: unknown): Parsed<BuyInput> {
  const row = record(body);
  const token = row.token;
  if (token !== "USDT" && token !== "USDC") {
    return { ok: false, message: "Token must be USDT or USDC." };
  }
  const network = typeof row.network === "string" ? row.network.trim().toUpperCase() : "";
  if (!BUY_NETWORKS[token].includes(network)) {
    return {
      ok: false,
      message: `${token} withdrawals use ${BUY_NETWORKS[token].join(", ")}.`,
    };
  }
  const amount = parsePositiveDecimal(row.amount, 2);
  if (amount === null) {
    return {
      ok: false,
      message: "Amount must be a positive USD value with at most 2 decimal places.",
    };
  }
  if (amount > 1_000_000) {
    return { ok: false, message: "Amount exceeds the desk limit of 1,000,000 USD." };
  }
  const walletAddress = typeof row.walletAddress === "string" ? row.walletAddress.trim() : "";
  if (!WALLET_RE.test(walletAddress)) {
    return { ok: false, message: "Enter a wallet address without spaces." };
  }
  return { ok: true, value: { token, network, amount, walletAddress } };
}

export function parseAddressInput(body: unknown): Parsed<AddressInput> {
  const row = record(body);
  const assetId = typeof row.assetId === "string" ? row.assetId.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!ID_RE.test(assetId)) {
    return { ok: false, message: "Choose a deposit asset." };
  }
  if (!LABEL_RE.test(label)) {
    return {
      ok: false,
      message: "Label must be 1–64 characters: letters, numbers, spaces, or . @ _ -",
    };
  }
  return { ok: true, value: { assetId, label } };
}

export function parseMockTradeInput(body: unknown): Parsed<MockTradeInput> {
  const row = record(body);
  const walletAddress = typeof row.walletAddress === "string" ? row.walletAddress.trim() : "";
  const asset = typeof row.asset === "string" ? row.asset.trim() : "";
  const amountInUSD = parsePositiveDecimal(row.amountInUSD, 2);
  const cryptoReceived = parsePositiveDecimal(row.cryptoReceived, 8);
  if (!WALLET_RE.test(walletAddress)) {
    return { ok: false, message: "Enter the deposit address to credit." };
  }
  if (!ASSET_RE.test(asset)) {
    return { ok: false, message: "Asset identifier is missing. Pick a wallet or asset first." };
  }
  if (amountInUSD === null) {
    return { ok: false, message: "USD amount must be greater than zero, with at most 2 decimals." };
  }
  if (cryptoReceived === null) {
    return {
      ok: false,
      message: "Crypto amount must be greater than zero, with at most 8 decimals.",
    };
  }
  return { ok: true, value: { walletAddress, asset, amountInUSD, cryptoReceived } };
}
