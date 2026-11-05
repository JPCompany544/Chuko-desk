import { BUY_NETWORKS } from "@/lib/validate";
import type {
  DepositAsset,
  DepositCatalogSource,
  DepositGroupId,
  DepositSection,
  DepositTokenOption,
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

const NATIVE_ORDER = ["BTC", "ETH", "SOL", "TRX", "BNB", "AVAX", "LTC", "BCH", "DOGE", "TON", "XRP"];
const GROUP_ORDER: DepositGroupId[] = ["native", "USDT", "USDC"];
const STABLE_NETWORKS: Record<string, readonly string[]> = {
  USDT: ["TRC20", "ERC20", "Solana", "BSC", "Polygon", "TON"],
  USDC: ["ERC20", "Solana", "Arbitrum", "Base", "Polygon"],
};

type CatalogSeed = {
  id: string;
  name: string;
  symbol: string;
  network: string;
  minimum: number;
};

const MAINNET_SEEDS: CatalogSeed[] = [
  { id: "BTC", name: "Bitcoin", symbol: "BTC", network: "Bitcoin", minimum: 2 },
  { id: "ETH", name: "Ethereum", symbol: "ETH", network: "Ethereum", minimum: 5 },
  { id: "SOL", name: "Solana", symbol: "SOL", network: "Solana", minimum: 5 },
  { id: "TRX", name: "Tron", symbol: "TRX", network: "Tron", minimum: 5 },
  { id: "BNB_BSC", name: "BNB", symbol: "BNB", network: "BNB Smart Chain", minimum: 5 },
  { id: "AVAX", name: "Avalanche", symbol: "AVAX", network: "Avalanche", minimum: 5 },
  { id: "LTC", name: "Litecoin", symbol: "LTC", network: "Litecoin", minimum: 2 },
  { id: "BCH", name: "Bitcoin Cash", symbol: "BCH", network: "Bitcoin Cash", minimum: 2 },
  { id: "DOGE", name: "Dogecoin", symbol: "DOGE", network: "Dogecoin", minimum: 2 },
  { id: "TON", name: "TON", symbol: "TON", network: "TON", minimum: 2 },
  { id: "XRP", name: "XRP", symbol: "XRP", network: "XRP", minimum: 2 },
  { id: "TRX_USDT_S2UZ", name: "USDT", symbol: "USDT", network: "TRC20", minimum: 10 },
  { id: "USDT_ERC20", name: "USDT", symbol: "USDT", network: "ERC20", minimum: 5 },
  { id: "SOL_USDT_EWAY", name: "USDT", symbol: "USDT", network: "Solana", minimum: 5 },
  { id: "USDT_BSC", name: "USDT", symbol: "USDT", network: "BSC", minimum: 5 },
  { id: "USDT_POLYGON", name: "USDT", symbol: "USDT", network: "Polygon", minimum: 5 },
  { id: "USDT_TON", name: "USDT", symbol: "USDT", network: "TON", minimum: 5 },
  { id: "USDC", name: "USDC", symbol: "USDC", network: "ERC20", minimum: 5 },
  { id: "SOL_USDC_PTHX", name: "USDC", symbol: "USDC", network: "Solana", minimum: 5 },
  { id: "USDC_ARB_3SBJ", name: "USDC", symbol: "USDC", network: "Arbitrum", minimum: 5 },
  { id: "USDC_BASECHAIN_ETH_5I5C", name: "USDC", symbol: "USDC", network: "Base", minimum: 5 },
  { id: "USDC_POLYGON_NXTB", name: "USDC", symbol: "USDC", network: "Polygon", minimum: 5 },
];

const SANDBOX_SEEDS: CatalogSeed[] = [
  { id: "BTC_TEST", name: "Bitcoin", symbol: "BTC", network: "Bitcoin", minimum: 5 },
  { id: "ETH_TEST5", name: "Ethereum", symbol: "ETH", network: "Ethereum", minimum: 5 },
  { id: "SOL_TEST", name: "Solana", symbol: "SOL", network: "Solana", minimum: 5 },
  { id: "TRX_TEST", name: "Tron", symbol: "TRX", network: "Tron", minimum: 5 },
  { id: "BNB_TEST", name: "BNB", symbol: "BNB", network: "BNB Smart Chain", minimum: 5 },
  { id: "AVAXTEST", name: "Avalanche", symbol: "AVAX", network: "Avalanche", minimum: 5 },
  { id: "LTC_TEST", name: "Litecoin", symbol: "LTC", network: "Litecoin", minimum: 5 },
  { id: "BCH_TEST", name: "Bitcoin Cash", symbol: "BCH", network: "Bitcoin Cash", minimum: 5 },
  { id: "DOGE_TEST", name: "Dogecoin", symbol: "DOGE", network: "Dogecoin", minimum: 5 },
  { id: "TON_TEST", name: "TON", symbol: "TON", network: "TON", minimum: 5 },
  { id: "XRP_TEST", name: "XRP", symbol: "XRP", network: "XRP", minimum: 5 },
  { id: "USDT_TRX_TEST2", name: "USDT", symbol: "USDT", network: "TRC20", minimum: 5 },
  { id: "USDT_ETH_TEST5_WFZR", name: "USDT", symbol: "USDT", network: "ERC20", minimum: 5 },
  { id: "USDT_B7ZDHS8D_TOR7", name: "USDT", symbol: "USDT", network: "Solana", minimum: 5 },
  { id: "USDT_BSC_TEST", name: "USDT", symbol: "USDT", network: "BSC", minimum: 5 },
  { id: "USD_POLYGON_TEST_MUMBAI_QFXA", name: "USDT", symbol: "USDT", network: "Polygon", minimum: 5 },
  { id: "USDTTT_TON_TEST", name: "USDT", symbol: "USDT", network: "TON", minimum: 5 },
  { id: "USDC_ETH_TEST5_0GER", name: "USDC", symbol: "USDC", network: "ERC20", minimum: 5 },
  { id: "SOL_USDC_JKVK", name: "USDC", symbol: "USDC", network: "Solana", minimum: 5 },
  { id: "USDC_ARB_SEPOLIA_V84S", name: "USDC", symbol: "USDC", network: "Arbitrum", minimum: 5 },
  { id: "USDC_BASECHAIN_ETH_TEST5_8SH8", name: "USDC", symbol: "USDC", network: "Base", minimum: 5 },
  { id: "USDC_AMOY_POLYGON_TEST_7WWV", name: "USDC", symbol: "USDC", network: "Polygon", minimum: 5 },
];

function orderIndex(list: readonly string[], value: string): number {
  const index = list.indexOf(value);
  return index === -1 ? list.length : index;
}

export function normalizeDepositSymbol(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (!upper) return "";
  if (upper === "BNB" || upper === "BNB_BSC" || upper === "BNB_TEST") return "BNB";
  if (upper.includes("USDC")) return "USDC";
  if (upper.includes("USDT") || upper.startsWith("USDTTT") || upper.startsWith("USD_POLYGON")) {
    return "USDT";
  }
  const head = upper.split("_")[0] ?? upper;
  const native = head.replace(/TEST\d*$/, "");
  if (NATIVE_ORDER.includes(native)) return native;
  if (NATIVE_ORDER.includes(upper)) return upper;
  return upper;
}

export function networkLabelFor(symbol: string, network: string, name = ""): string {
  const token = normalizeDepositSymbol(symbol);
  const raw = network.trim();
  const haystack = `${raw} ${name}`.toLowerCase().replace(/[_-]+/g, " ");

  if (token === "USDT" || token === "USDC") {
    if (/\b(arbitrum|arb)\b/.test(haystack)) return "Arbitrum";
    if (/\bbase\b/.test(haystack)) return "Base";
    if (/\b(polygon|matic)\b/.test(haystack)) return "Polygon";
    if (/\b(solana|sol)\b/.test(haystack)) return "Solana";
    if (/\b(bsc|bnb)\b/.test(haystack) || haystack.includes("smart chain")) return "BSC";
    if (/\b(ton|telegram)\b/.test(haystack) || haystack.includes("open network")) return "TON";
    if (/\b(trc20|tron|trx)\b/.test(haystack)) return "TRC20";
    if (/\b(erc20|ethereum|eth)\b/.test(haystack)) return "ERC20";
  }

  if (!raw) return name || token;
  return raw.replace(/[_-]+/g, " ");
}

function depositGroup(symbol: string): DepositGroupId {
  if (symbol === "USDT" || symbol === "USDC") return symbol;
  return "native";
}

function compareAssets(a: DepositAsset, b: DepositAsset): number {
  const byGroup = orderIndex(GROUP_ORDER, depositGroup(a.symbol)) - orderIndex(GROUP_ORDER, depositGroup(b.symbol));
  if (byGroup !== 0) return byGroup;
  const byToken = orderIndex(NATIVE_ORDER, a.symbol) - orderIndex(NATIVE_ORDER, b.symbol);
  if (byToken !== 0) return byToken;
  if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
  const networkOrder = STABLE_NETWORKS[a.symbol] ?? [];
  const byNetwork = orderIndex(networkOrder, a.networkLabel) - orderIndex(networkOrder, b.networkLabel);
  if (byNetwork !== 0) return byNetwork;
  return a.networkLabel.localeCompare(b.networkLabel) || a.name.localeCompare(b.name);
}

function seedAsset(seed: CatalogSeed): DepositAsset {
  const symbol = normalizeDepositSymbol(seed.symbol);
  return {
    id: seed.id,
    name: seed.name,
    identifier: seed.id,
    symbol,
    network: seed.network,
    networkLabel: networkLabelFor(symbol, seed.network, seed.name),
    minimum: seed.minimum,
    isActive: true,
  };
}

export function fallbackDepositAssets(env: "sandbox" | "production"): DepositAsset[] {
  const seeds = env === "production" ? MAINNET_SEEDS : SANDBOX_SEEDS;
  return seeds.map(seedAsset).sort(compareAssets);
}

export function resolveDepositAssets(
  live: DepositAsset[] | null,
  env: "sandbox" | "production",
): { source: DepositCatalogSource; assets: DepositAsset[] } {
  if (live && live.length > 0) return { source: "breet", assets: live };
  return { source: "fallback", assets: fallbackDepositAssets(env) };
}

export function groupDepositAssets(assets: DepositAsset[]): DepositSection[] {
  const bySymbol = new Map<string, DepositAsset[]>();
  for (const asset of assets) {
    const list = bySymbol.get(asset.symbol) ?? [];
    list.push(asset);
    bySymbol.set(asset.symbol, list);
  }

  const tokens: DepositTokenOption[] = [...bySymbol.entries()].map(([symbol, list]) => ({
    symbol,
    group: depositGroup(symbol),
    assets: [...list].sort(compareAssets),
  }));
  tokens.sort((a, b) => compareAssets(a.assets[0]!, b.assets[0]!));

  return GROUP_ORDER.flatMap((id) => {
    const sectionTokens = tokens.filter((token) => token.group === id);
    if (sectionTokens.length === 0) return [];
    const title = id === "native" ? "Native" : id;
    return [{ id, title, tokens: sectionTokens }];
  });
}

const RECORD_ID = /^[a-f0-9]{24}$/i;

export function recordIdForAsset(requested: string, assets: DepositAsset[]): string {
  const assetId = requested.trim();
  if (RECORD_ID.test(assetId)) return assetId;
  const match = assets.find((asset) => asset.identifier === assetId || asset.id === assetId);
  if (match && RECORD_ID.test(match.id)) return match.id;
  return assetId;
}

export function toDepositAssets(data: unknown): DepositAsset[] {
  if (!Array.isArray(data)) return [];
  const assets: DepositAsset[] = [];
  for (const entry of data) {
    const row = record(entry);
    const rawId = text(row.id);
    const rawIdentifier = text(row.identifier);
    const identifier = rawIdentifier ?? rawId;
    const id = rawId ?? rawIdentifier;
    if (!id || !identifier) continue;
    const symbol = normalizeDepositSymbol(text(row.symbol) ?? identifier);
    if (!symbol) continue;
    const network = text(row.network) ?? "";
    const name = text(row.name) ?? [symbol, network.replace(/[_-]+/g, " ")].filter(Boolean).join(" ");
    assets.push({
      id,
      name,
      identifier,
      symbol,
      network,
      networkLabel: networkLabelFor(symbol, network, name),
      minimum: num(row.minimum),
      isActive: row.isActive !== false,
    });
  }
  return assets.sort(compareAssets);
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
