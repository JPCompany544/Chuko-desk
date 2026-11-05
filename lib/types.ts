export type StableToken = "USDT" | "USDC";

export type FieldError = {
  field?: string;
  message?: string;
};

export type PageMeta = {
  page?: number;
  pages?: number;
  totalDocs?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export type DeskMeta = {
  env: "sandbox" | "production";
  baseUrl: "https://api.breet.io/v1";
  mockTrades: boolean;
};

export type FiatWallet = {
  currency: string;
  balance: number;
};

export type DeskAccount = {
  merchantReference: string | null;
  isActive: boolean | null;
  autoSettlement: boolean | null;
  platformFeePercent: number | null;
  withdrawalFeeBearer: string | null;
  fiatWallets: FiatWallet[];
};

export type WithdrawalNetwork = {
  network: string;
  enabled: boolean;
  fee: number | null;
};

export type WithdrawalToken = {
  symbol: StableToken;
  enabled: boolean;
  networks: WithdrawalNetwork[];
};

export type WithdrawalCatalog = {
  tokens: WithdrawalToken[];
  limits: {
    minimum: number | null;
    maximum: number | null;
  };
  source: "breet" | "fallback";
};

export type DepositCatalogSource = "breet" | "fallback";

export type DepositAsset = {
  id: string;
  name: string;
  identifier: string;
  symbol: string;
  network: string;
  networkLabel: string;
  minimum: number | null;
  isActive: boolean;
};

export type DepositGroupId = "native" | "USDT" | "USDC";

export type DepositTokenOption = {
  symbol: string;
  group: DepositGroupId;
  assets: DepositAsset[];
};

export type DepositSection = {
  id: DepositGroupId;
  title: string;
  tokens: DepositTokenOption[];
};

export type DeskWallet = {
  id: string;
  name: string;
  label: string;
  address: string;
  identifier: string;
  assetId: string;
  isActive: boolean;
  createdAt: string | null;
};

export type ActivityKind = "buy" | "sell" | "payout";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  status: string;
  title: string;
  subtitle: string;
  amount: string;
  createdAt: string | null;
  href: string | null;
};

export type BuyResult = {
  id: string | null;
  externalId: string;
  token: StableToken;
  network: string;
  amount: number;
  walletAddress: string;
  message: string;
};

export type AddressResult = {
  id: string | null;
  address: string;
  label: string;
  assetId: string;
  message: string;
};

export type MockTradeResult = {
  reference: string;
  txHash: string;
  walletAddress: string;
  asset: string;
  amountInUSD: number;
  cryptoReceived: number;
  message: string;
};
