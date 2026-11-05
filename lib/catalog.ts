import { BUY_NETWORKS } from "@/lib/validate";
import type {
  DepositAsset,
  DeskAccount,
  DeskWallet,
  StableToken,
  WithdrawalCatalog,
  WithdrawalNetwork,
  WithdrawalToken,
} from "@/lib/types";

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function flag(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export const FALLBACK_CATALOG: WithdrawalCatalog = {
  source: "fallback",
  limits: { minimum: null, maximum: null },
  tokens: (["USDT", "USDC"] as const).map((symbol) => ({
    symbol,
    enabled: true,
    networks: BUY_NETWORKS[symbol].map((network) => ({
      network,
      enabled: true,
      fee: null,
    })),
  })),
};

function asToken(value: unknown): WithdrawalToken | null {
  const row = record(value);
  const symbol = row.symbol;
  if (symbol !== "USDT" && symbol !== "USDC") return null;
  const networks: WithdrawalNetwork[] = [];
  if (Array.isArray(row.networks)) {
    for (const entry of row.networks) {
      const networkRow = record(entry);
      const network = text(networkRow.network);
      if (!network || !BUY_NETWORKS[symbol].includes(network)) continue;
      networks.push({
        network,
        enabled: networkRow.enabled !== false,
        fee: num(networkRow.fee),
      });
    }
  }
  return {
    symbol,
    enabled: row.enabled !== false,
    networks,
  };
}

export function toWithdrawalCatalog(data: unknown): WithdrawalCatalog {
  const row = record(data);
  const tokens: WithdrawalToken[] = [];
  if (Array.isArray(row.tokens)) {
    for (const entry of row.tokens) {
      const token = asToken(entry);
      if (token) tokens.push(token);
    }
  }
  if (tokens.length === 0) return FALLBACK_CATALOG;
  const limits = record(row.limits);
  return {
    source: "breet",
    tokens,
    limits: {
      minimum: num(limits.minimum),
      maximum: num(limits.maximum),
    },
  };
}

export function tokenFromCatalog(
  catalog: WithdrawalCatalog,
  symbol: StableToken,
): WithdrawalToken | undefined {
  return catalog.tokens.find((token) => token.symbol === symbol);
}

export function toDepositAssets(data: unknown): DepositAsset[] {
  if (!Array.isArray(data)) return [];
  const assets: DepositAsset[] = [];
  for (const entry of data) {
    const row = record(entry);
    const id = text(row.id);
    const identifier = text(row.identifier);
    const name = text(row.name);
    if (!id || !identifier || !name) continue;
    assets.push({
      id,
      name,
      identifier,
      symbol: text(row.symbol) ?? identifier,
      network: text(row.network) ?? "",
      minimum: num(row.minimum),
      isActive: row.isActive !== false,
    });
  }
  return assets.sort((a, b) => {
    const rank = (asset: DepositAsset) =>
      asset.symbol === "USDT" || asset.symbol === "USDC" ? 0 : 1;
    const bySymbol = rank(a) - rank(b);
    if (bySymbol !== 0) return bySymbol;
    return a.name.localeCompare(b.name);
  });
}

export function toWallets(data: unknown): DeskWallet[] {
  if (!Array.isArray(data)) return [];
  const wallets: DeskWallet[] = [];
  for (const entry of data) {
    const row = record(entry);
    const id = text(row.id);
    const address = text(row.address);
    const identifier = text(row.identifier);
    if (!id || !address || !identifier) continue;
    wallets.push({
      id,
      name: text(row.name) ?? identifier,
      label: text(row.label) ?? "",
      address,
      identifier,
      assetId: text(row.asset) ?? "",
      isActive: row.isActive !== false,
      createdAt: text(row.createdAt),
    });
  }
  return wallets;
}

export function toPublicAccount(data: unknown): DeskAccount {
  const row = record(data);
  const wallets = Array.isArray(row.fiatWallets) ? row.fiatWallets : [];
  return {
    merchantReference: text(row.merchantReference),
    isActive: flag(row.isActive),
    autoSettlement: flag(row.autoSettlement),
    platformFeePercent: num(row.platformFeePercent),
    withdrawalFeeBearer: text(row.withdrawalFeeBearer),
    fiatWallets: wallets.flatMap((entry) => {
      const wallet = record(entry);
      const currency = text(wallet.currency);
      const balance = num(wallet.balance);
      if (!currency || balance === null) return [];
      return [{ currency: currency.toUpperCase(), balance }];
    }),
  };
}
