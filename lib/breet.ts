import "server-only";

import { randomUUID } from "node:crypto";

import {
  recordIdForAsset,
  toDepositAssets,
  toPublicAccount,
  toWallets,
  toWithdrawalCatalog,
} from "@/lib/catalog";
import type {
  AddressResult,
  BuyResult,
  DepositAsset,
  DeskAccount,
  DeskWallet,
  MockTradeResult,
  PageMeta,
  WithdrawalCatalog,
  FieldError,
} from "@/lib/types";
import type { AddressInput, BuyInput, MockTradeInput } from "@/lib/validate";

const BASE_URL = "https://api.breet.io/v1";

export class BreetError extends Error {
  readonly status: number;
  readonly errors: FieldError[];

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message);
    this.name = "BreetError";
    this.status = status;
    this.errors = errors;
  }
}

type Envelope<T> = {
  data: T;
  message: string;
  meta: PageMeta;
};

export function breetEnv(): "sandbox" | "production" {
  return process.env.BREET_ENV?.trim().toLowerCase() === "production" ? "production" : "sandbox";
}

function credentials(): { appId: string; appSecret: string } {
  const appId = process.env.BREET_APP_ID?.trim();
  const appSecret = process.env.BREET_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new BreetError(
      "Set BREET_APP_ID and BREET_APP_SECRET on the server. They are not sent to the browser.",
      503,
    );
  }
  return { appId, appSecret };
}

function cleanMessage(value: unknown, fallback: string): string {
  const message = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return (message || fallback).slice(0, 300);
}

function fieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const message = typeof row.message === "string" ? row.message.slice(0, 180) : undefined;
    const field = typeof row.field === "string" ? row.field.slice(0, 80) : undefined;
    if (!message && !field) return [];
    return [{ message, field }];
  });
}

async function breetRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown; search?: Record<string, string | number | undefined> },
): Promise<Envelope<T>> {
  const { appId, appSecret } = credentials();
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(init?.search ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers = new Headers();
  headers.set("x-app-id", appId);
  headers.set("x-app-secret", appSecret);
  headers.set("X-Breet-Env", breetEnv());
  headers.set("Accept", "application/json");
  if (init?.body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new BreetError("Could not reach the Breet API.", 502);
  }

  const raw = await response.text();
  let payload: Record<string, unknown> | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      payload = null;
    }
  }

  if (response.status === 429) {
    const retry = response.headers.get("retry-after");
    throw new BreetError(
      retry ? `Breet rate limit reached. Retry in ${retry}s.` : "Breet rate limit reached.",
      429,
    );
  }

  const success = payload?.success;
  if (!response.ok || success === false) {
    throw new BreetError(
      cleanMessage(payload?.message, `Breet request failed (${response.status}).`),
      response.status,
      fieldErrors(payload?.errors),
    );
  }

  const meta = payload?.meta;
  return {
    data: (payload?.data ?? null) as T,
    message: cleanMessage(payload?.message, "OK"),
    meta: meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as PageMeta) : {},
  };
}

export async function getAccount(): Promise<DeskAccount> {
  const result = await breetRequest<unknown>("/users/fetch-integration");
  return toPublicAccount(result.data);
}

export async function getWithdrawalCatalog(): Promise<WithdrawalCatalog> {
  const result = await breetRequest<unknown>("/payments/supported-assets-info");
  return toWithdrawalCatalog(result.data);
}

export async function withdrawStablecoin(input: BuyInput): Promise<BuyResult> {
  const pin = process.env.BREET_PIN?.trim();
  if (!pin) {
    throw new BreetError("Set BREET_PIN on the server before sending a withdrawal.", 503);
  }
  const externalId = `chuko-buy-${randomUUID()}`;
  const result = await breetRequest<{ id?: string }>("/payments/withdraw/address", {
    body: {
      amount: input.amount,
      walletAddress: input.walletAddress,
      token: input.token,
      network: input.network,
      externalId,
      pin,
    },
  });
  return {
    id: typeof result.data?.id === "string" ? result.data.id : null,
    externalId,
    token: input.token,
    network: input.network,
    amount: input.amount,
    walletAddress: input.walletAddress,
    message: result.message,
  };
}

export async function getDepositAssets(): Promise<DepositAsset[]> {
  const result = await breetRequest<unknown>("/trades/assets");
  return toDepositAssets(result.data);
}

export async function getWallets(page = 1): Promise<{ wallets: DeskWallet[]; meta: PageMeta }> {
  const result = await breetRequest<unknown>("/trades/wallets", {
    search: { page, size: 25 },
  });
  return { wallets: toWallets(result.data), meta: result.meta };
}

async function canonicalAssetId(assetId: string): Promise<string> {
  if (/^[a-f0-9]{24}$/i.test(assetId)) return assetId;
  try {
    return recordIdForAsset(assetId, await getDepositAssets());
  } catch {
    return assetId;
  }
}

export async function generateAddress(input: AddressInput): Promise<AddressResult> {
  const assetId = await canonicalAssetId(input.assetId);
  const result = await breetRequest<{ id?: string; address?: string }>(
    `/trades/sell/assets/${encodeURIComponent(assetId)}/generate-address`,
    { body: { label: input.label } },
  );
  const address = result.data?.address;
  if (!address) {
    throw new BreetError("Breet did not return a deposit address.", 502);
  }
  return {
    id: typeof result.data?.id === "string" ? result.data.id : null,
    address,
    label: input.label,
    assetId,
    message: result.message,
  };
}

export async function mockTrade(input: MockTradeInput): Promise<MockTradeResult> {
  if (breetEnv() !== "sandbox") {
    throw new BreetError("Mock trades are only available when X-Breet-Env is sandbox.", 403);
  }
  const reference = `chuko-sell-${randomUUID()}`;
  const txHash = `0xmock${randomUUID().replace(/-/g, "")}`;
  const result = await breetRequest<unknown>("/trades/sell/mock-trade", {
    body: {
      walletAddress: input.walletAddress,
      asset: input.asset,
      amountInUSD: input.amountInUSD,
      cryptoReceived: input.cryptoReceived,
      reference,
      txHash,
    },
  });
  return {
    reference,
    txHash,
    walletAddress: input.walletAddress,
    asset: input.asset,
    amountInUSD: input.amountInUSD,
    cryptoReceived: input.cryptoReceived,
    message: result.message,
  };
}

export async function getActivity(): Promise<{
  deposits: unknown;
  withdrawals: unknown;
}> {
  const [deposits, withdrawals] = await Promise.all([
    breetRequest<unknown>("/trades/transactions", { search: { page: 1, size: 25 } }),
    breetRequest<unknown>("/payments/withdrawals", { search: { page: 1, size: 25 } }),
  ]);
  return { deposits: deposits.data, withdrawals: withdrawals.data };
}
