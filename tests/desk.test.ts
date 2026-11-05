import assert from "node:assert/strict";
import test from "node:test";

import { mapDeposits, mapWithdrawals, mergeActivity } from "../lib/activity.ts";
import {
  fallbackDepositAssets,
  groupDepositAssets,
  resolveDepositAssets,
  toDepositAssets,
  toPublicAccount,
  toWithdrawalCatalog,
} from "../lib/catalog.ts";
import { parseBuyInput, parseMockTradeInput } from "../lib/validate.ts";

test("public account drops secrets and contact fields", () => {
  const account = toPublicAccount({
    merchantReference: "B-1",
    isActive: true,
    autoSettlement: false,
    platformFeePercent: 1.5,
    withdrawalFeeBearer: "user",
    webhook: { secret: "breet_whsec_should_not_leak", url: "https://example.test/hook" },
    appId: "app-id-should-not-leak",
    user: { email: "person@example.test", phoneNumber: "2340000000000", name: "Hidden" },
    fiatWallets: [
      { currency: "usd", balance: 12.5 },
      { currency: "ngn", balance: 1000 },
    ],
  });

  const serialized = JSON.stringify(account);
  assert.equal(serialized.includes("whsec"), false);
  assert.equal(serialized.includes("app-id"), false);
  assert.equal(serialized.includes("person@"), false);
  assert.equal(serialized.includes("Hidden"), false);
  assert.equal(serialized.includes("234000"), false);
  assert.deepEqual(account.fiatWallets, [
    { currency: "USD", balance: 12.5 },
    { currency: "NGN", balance: 1000 },
  ]);
});

test("buy input accepts USDT on TRC20 and rejects USDC on TON", () => {
  const ok = parseBuyInput({
    token: "USDT",
    network: "trc20",
    amount: "10.50",
    walletAddress: "TXYZabcd12345678",
    pin: "should-be-ignored",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.network, "TRC20");

  const blocked = parseBuyInput({
    token: "USDC",
    network: "TON",
    amount: "10",
    walletAddress: "TXYZabcd12345678",
  });
  assert.equal(blocked.ok, false);
});

test("mock trade requires a positive crypto amount", () => {
  const parsed = parseMockTradeInput({
    walletAddress: "TV8dNYYBgL3xLbQcJLMBNavY4gYNqPF8Jv",
    asset: "TRX_TEST",
    amountInUSD: "50",
    cryptoReceived: "0",
  });
  assert.equal(parsed.ok, false);
});

test("withdrawal catalog keeps only USDT and USDC networks", () => {
  const catalog = toWithdrawalCatalog({
    tokens: [
      {
        symbol: "USDT",
        enabled: true,
        networks: [
          { network: "TRC20", enabled: true, fee: 1 },
          { network: "BTC", enabled: true, fee: 9 },
        ],
      },
      { symbol: "BTC", enabled: true, networks: [] },
    ],
    limits: { minimum: 10, maximum: 10000 },
  });
  assert.equal(catalog.source, "breet");
  assert.deepEqual(
    catalog.tokens[0]?.networks.map((network) => network.network),
    ["TRC20"],
  );
  assert.equal(catalog.limits.maximum, 10000);
});

test("live deposit rows keep every asset and label stablecoin networks", () => {
  const assets = toDepositAssets([
    {
      id: "67063f653b4a1f6c7a60ec58",
      identifier: "USDT_TRX_TEST2",
      name: "Tether USD",
      symbol: "USDT",
      network: "Tron",
      minimum: 5,
      isActive: true,
    },
    {
      id: "eth-usdt",
      identifier: "USDT_ETH_TEST5_WFZR",
      name: "Tether USD",
      symbol: "USDT",
      network: "Ethereum",
      minimum: "5",
      isActive: false,
    },
    {
      id: "btc",
      name: "Bitcoin",
      symbol: "BTC",
      network: "Bitcoin",
      minimum: 2,
    },
    {
      id: "bch",
      identifier: "BCH_TEST",
      name: "Bitcoin Cash Test",
      symbol: "BCH",
      network: "Bitcoin_Cash",
      minimum: 5,
      isActive: true,
    },
  ]);

  assert.equal(assets.length, 4);
  assert.equal(assets.find((asset) => asset.identifier === "USDT_TRX_TEST2")?.networkLabel, "TRC20");
  assert.equal(assets.find((asset) => asset.identifier === "USDT_ETH_TEST5_WFZR")?.isActive, false);
  assert.equal(assets.find((asset) => asset.id === "btc")?.identifier, "btc");
  assert.equal(assets.find((asset) => asset.identifier === "BCH_TEST")?.networkLabel, "Bitcoin Cash");

  const grouped = groupDepositAssets(assets);
  assert.deepEqual(
    grouped.map((section) => section.id),
    ["native", "USDT"],
  );
  assert.deepEqual(
    grouped.find((section) => section.id === "USDT")?.tokens[0]?.assets.map((asset) => asset.networkLabel),
    ["TRC20", "ERC20"],
  );
});

test("failed or empty asset calls fall back to the full catalog", () => {
  const sandbox = resolveDepositAssets([], "sandbox");
  assert.equal(sandbox.source, "fallback");
  assert.equal(sandbox.assets.length, 22);
  const grouped = groupDepositAssets(sandbox.assets);
  assert.deepEqual(
    grouped.map((section) => section.id),
    ["native", "USDT", "USDC"],
  );
  assert.deepEqual(
    grouped[0]?.tokens.map((token) => token.symbol),
    ["BTC", "ETH", "SOL", "TRX", "BNB", "AVAX", "LTC", "BCH", "DOGE", "TON", "XRP"],
  );
  assert.deepEqual(
    grouped[1]?.tokens[0]?.assets.map((asset) => asset.networkLabel),
    ["TRC20", "ERC20", "Solana", "BSC", "Polygon", "TON"],
  );
  assert.deepEqual(
    grouped[2]?.tokens[0]?.assets.map((asset) => asset.networkLabel),
    ["ERC20", "Solana", "Arbitrum", "Base", "Polygon"],
  );
  assert.equal(
    sandbox.assets.find((asset) => asset.symbol === "USDT" && asset.networkLabel === "TRC20")?.identifier,
    "USDT_TRX_TEST2",
  );

  const production = fallbackDepositAssets("production");
  assert.equal(
    production.find((asset) => asset.symbol === "USDT" && asset.networkLabel === "TRC20")?.identifier,
    "TRX_USDT_S2UZ",
  );
  assert.equal(production.find((asset) => asset.symbol === "BTC")?.minimum, 2);
  assert.equal(production.find((asset) => asset.symbol === "BNB")?.identifier, "BNB_BSC");

  const live = toDepositAssets([
    {
      id: "one",
      identifier: "TRX_TEST",
      name: "Tron Test",
      symbol: "TRX",
      network: "Tron",
      minimum: 5,
      isActive: true,
    },
  ]);
  const resolved = resolveDepositAssets(live, "sandbox");
  assert.equal(resolved.source, "breet");
  assert.equal(resolved.assets.length, 1);
  assert.equal(resolveDepositAssets(null, "production").assets[0]?.identifier, "BTC");
});

test("activity marks stablecoin withdrawals as buys and deposits as sells", () => {
  const items = mergeActivity(
    mapDeposits([
      {
        id: "dep-1",
        status: "completed",
        amountReceived: 20,
        currency: "usd",
        address: "TAddress111111111111",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]),
    mapWithdrawals([
      {
        id: "wd-1",
        amount: 15,
        currency: "usd",
        status: "pending",
        createdAt: "2026-01-03T00:00:00.000Z",
        meta: { type: "address", token: "USDT", network: "SOL", walletAddress: "So111111111111111111" },
      },
      {
        id: "wd-2",
        amount: 5000,
        currency: "ngn",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        meta: { type: "nuban", bankName: "Test Bank", accountNumber: "0123456789" },
      },
    ]),
  );
  assert.deepEqual(
    items.map((item) => item.kind),
    ["buy", "sell", "payout"],
  );
});
