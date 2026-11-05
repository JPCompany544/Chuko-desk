"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Notice } from "@/components/Notice";
import { fallbackDepositAssets, groupDepositAssets } from "@/lib/catalog";
import { getJson, postJson } from "@/lib/client";
import type {
  AddressResult,
  DepositAsset,
  DepositCatalogSource,
  DeskMeta,
  DeskWallet,
  MockTradeResult,
} from "@/lib/types";

type AssetPayload = {
  assets: DepositAsset[];
  source?: DepositCatalogSource;
  message?: string;
};

function minimumLabel(minimum: number | null): string {
  return minimum === null ? "Minimum not listed" : `Min ${minimum} USD`;
}

export function SellDesk() {
  const [assets, setAssets] = useState<DepositAsset[]>([]);
  const [wallets, setWallets] = useState<DeskWallet[]>([]);
  const [source, setSource] = useState<DepositCatalogSource | null>(null);
  const [catalogNote, setCatalogNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [assetKey, setAssetKey] = useState("");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [amountInUSD, setAmountInUSD] = useState("50");
  const [cryptoReceived, setCryptoReceived] = useState("50");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [tradeResult, setTradeResult] = useState<MockTradeResult | null>(null);
  const [pendingAddress, setPendingAddress] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getJson<DeskMeta>("/api/meta").catch(() => null),
      getJson<AssetPayload>("/api/sell/assets").catch(() => null),
      getJson<{ wallets: DeskWallet[] }>("/api/sell/wallets").catch(() => null),
    ]).then(([meta, assetResult, walletResult]) => {
      if (cancelled) return;
      const env = meta?.ok ? meta.env : "sandbox";
      setMockEnabled(meta?.ok ? meta.mockTrades : env === "sandbox");
      if (!assetResult?.ok || assetResult.assets.length === 0) {
        setAssets(fallbackDepositAssets(env));
        setSource("fallback");
        setCatalogNote(
          assetResult && !assetResult.ok
            ? assetResult.message
            : "Live assets were unavailable, so this is the documented Breet catalog.",
        );
      } else {
        setAssets(assetResult.assets);
        setSource(assetResult.source ?? "breet");
        setCatalogNote(
          assetResult.source === "fallback"
            ? (assetResult.message ??
              "Live assets were unavailable, so this is the documented Breet catalog.")
            : null,
        );
      }
      if (walletResult?.ok) setWallets(walletResult.wallets);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => groupDepositAssets(assets), [assets]);
  const tokens = useMemo(() => sections.flatMap((section) => section.tokens), [sections]);
  const token = tokens.find((entry) => entry.symbol === symbol) ?? null;
  const selected = token?.assets.find((asset) => asset.identifier === assetKey) ?? null;
  const selectedIdentifier = selected?.identifier;
  const orderedWallets = selectedIdentifier
    ? [...wallets].sort((a, b) => {
        const rank = (wallet: DeskWallet) => (wallet.identifier === selectedIdentifier ? 0 : 1);
        return rank(a) - rank(b);
      })
    : wallets;

  function clearDestination() {
    setAddress("");
    setAddressResult(null);
    setAddressError(null);
    setTradeResult(null);
    setTradeError(null);
    setCopied(false);
  }

  function selectToken(nextSymbol: string) {
    const next = tokens.find((entry) => entry.symbol === nextSymbol);
    const active = next?.assets.filter((asset) => asset.isActive) ?? [];
    const only = active.length === 1 ? active[0] : undefined;
    setSymbol(nextSymbol);
    setAssetKey(only?.identifier ?? "");
    setIdentifier(only?.identifier ?? "");
    clearDestination();
  }

  function selectNetwork(asset: DepositAsset) {
    if (!asset.isActive) return;
    setSymbol(asset.symbol);
    setAssetKey(asset.identifier);
    setIdentifier(asset.identifier);
    clearDestination();
  }

  function chooseWallet(wallet: DeskWallet) {
    const match =
      assets.find((asset) => asset.identifier === wallet.identifier) ??
      assets.find((asset) => asset.id === wallet.assetId);
    if (match) {
      setSymbol(match.symbol);
      setAssetKey(match.identifier);
      setIdentifier(match.identifier);
    } else {
      setIdentifier(wallet.identifier);
    }
    setAddress(wallet.address);
    setAddressResult(null);
    setAddressError(null);
    setTradeResult(null);
    setTradeError(null);
    setCopied(false);
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setPendingAddress(true);
    setAddressError(null);
    setAddressResult(null);
    try {
      const result = await postJson<{ address: AddressResult }>("/api/sell/address", {
        // Generate-address takes the asset identifier (BTC_TEST, TRX_USDT_S2UZ).
        assetId: selected.identifier,
        label,
      });
      if (!result.ok) {
        setAddressError(result.message);
        return;
      }
      setAddressResult(result.address);
      setAddress(result.address.address);
      setIdentifier(selected.identifier);
      const walletsResult = await getJson<{ wallets: DeskWallet[] }>("/api/sell/wallets");
      if (walletsResult.ok) setWallets(walletsResult.wallets);
    } catch {
      setAddressError("Could not generate an address.");
    } finally {
      setPendingAddress(false);
    }
  }

  async function onMock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingTrade(true);
    setTradeError(null);
    setTradeResult(null);
    try {
      const result = await postJson<{ trade: MockTradeResult }>("/api/sell/mock-trade", {
        walletAddress: address,
        asset: identifier,
        amountInUSD,
        cryptoReceived,
      });
      if (!result.ok) {
        setTradeError(result.message);
        return;
      }
      setTradeResult(result.trade);
    } catch {
      setTradeError("Could not mock the trade.");
    } finally {
      setPendingTrade(false);
    }
  }

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setAddressError("Could not copy the address.");
    }
  }

  return (
    <div className="stack">
      {catalogNote ? <Notice tone="neutral">{catalogNote}</Notice> : null}

      <section className="panel" aria-labelledby="deposit-token-heading">
        <div className="summary-line">
          <h2 id="deposit-token-heading">Token</h2>
          {ready ? (
            <p className="quiet">
              {assets.length} assets
              {source === "fallback" ? " · documented catalog" : ""}
            </p>
          ) : (
            <p className="quiet">Loading deposit assets…</p>
          )}
        </div>
        {ready && assets.length > 0 ? (
          <div className="asset-groups">
            {sections.map((section) => (
              <div key={section.id} className="asset-group">
                <p className="group-label" id={`deposit-group-${section.id}`}>
                  {section.title}
                </p>
                <div className="token-grid" role="group" aria-labelledby={`deposit-group-${section.id}`}>
                  {section.tokens.map((entry) => {
                    const activeCount = entry.assets.filter((asset) => asset.isActive).length;
                    const networkCount = entry.assets.length;
                    return (
                      <button
                        key={entry.symbol}
                        type="button"
                        className="choice choice-sell"
                        aria-pressed={symbol === entry.symbol}
                        disabled={activeCount === 0}
                        onClick={() => selectToken(entry.symbol)}
                      >
                        <strong>{entry.symbol}</strong>
                        <span>
                          {activeCount === 0
                            ? "Unavailable"
                            : networkCount === 1
                              ? entry.assets[0]?.networkLabel
                              : `${networkCount} networks`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {token ? (
        <section className="panel" aria-labelledby="deposit-network-heading">
          <h2 id="deposit-network-heading">{token.symbol} network</h2>
          <p className="quiet">
            {token.assets.length === 1
              ? "This token deposits on one network."
              : "Choose the network for this deposit."}
          </p>
          <div className="choices network-choices" role="group" aria-labelledby="deposit-network-heading">
            {token.assets.map((asset) => (
              <button
                key={asset.identifier}
                type="button"
                className="choice choice-sell"
                aria-pressed={selected?.identifier === asset.identifier}
                disabled={!asset.isActive}
                onClick={() => selectNetwork(asset)}
              >
                <strong>{asset.networkLabel}</strong>
                <span>{asset.isActive ? minimumLabel(asset.minimum) : "Unavailable"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : ready ? (
        <p className="quiet">Select a token to see its networks.</p>
      ) : null}

      {selected ? (
        <form className="panel form" onSubmit={onGenerate}>
          <div className="summary-line">
            <h2>Deposit address</h2>
            <p className="quiet">
              {selected.symbol} on {selected.networkLabel}
              {selected.minimum !== null ? ` · Minimum deposit ${selected.minimum} USD` : ""}
            </p>
          </div>
          <p className="quiet mono">{selected.identifier}</p>
          <label className="field">
            <span className="field-label">Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="customer-1042"
              autoComplete="off"
              required
            />
            <span className="field-hint">One label per asset. Pick an existing wallet below if that label already has an address.</span>
          </label>
          <button className="btn btn-sell" type="submit" disabled={pendingAddress || !selected.isActive}>
            {pendingAddress ? "Generating…" : "Generate address"}
          </button>
          {addressError ? <Notice tone="error">{addressError}</Notice> : null}
          {addressResult ? <Notice tone="ok">{addressResult.message}</Notice> : null}
          {address ? (
            <div className="address-card">
              <p className="mono">{address}</p>
              <button type="button" className="btn btn-ghost" onClick={copyAddress}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="quiet">The address is permanent. Generate it once for this label, then copy it.</p>
          )}
        </form>
      ) : null}

      <section className="panel">
        <h2>Existing wallets</h2>
        <p className="quiet">Select one to reuse its address for this asset.</p>
        {orderedWallets.length === 0 ? (
          <p className="quiet">No wallets yet.</p>
        ) : (
          <ul className="wallet-list">
            {orderedWallets.map((wallet) => (
              <li key={wallet.id}>
                <button
                  type="button"
                  aria-pressed={address === wallet.address}
                  onClick={() => chooseWallet(wallet)}
                >
                  <strong>{wallet.name}</strong>
                  <span className="quiet"> {wallet.label || wallet.identifier}</span>
                  <div className="mono">{wallet.address}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mockEnabled ? (
        <details className="panel mock-details">
          <summary>Mock deposit</summary>
          <form className="form" onSubmit={onMock}>
            <p className="quiet">
              Sandbox only. Credits the address without sending crypto, after you have a destination.
            </p>
            <label className="field">
              <span className="field-label">Wallet address</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Asset identifier</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                required
              />
            </label>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">USD amount</span>
                <input
                  inputMode="decimal"
                  value={amountInUSD}
                  onChange={(event) => setAmountInUSD(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Crypto received</span>
                <input
                  inputMode="decimal"
                  value={cryptoReceived}
                  onChange={(event) => setCryptoReceived(event.target.value)}
                  required
                />
              </label>
            </div>
            <button className="btn btn-ghost" type="submit" disabled={pendingTrade}>
              {pendingTrade ? "Submitting…" : "Mock deposit"}
            </button>
            {tradeError ? <Notice tone="error">{tradeError}</Notice> : null}
            {tradeResult ? (
              <>
                <Notice tone="ok">{tradeResult.message}</Notice>
                <p className="quiet mono">{tradeResult.reference}</p>
                <p className="quiet mono">{tradeResult.txHash}</p>
              </>
            ) : null}
          </form>
        </details>
      ) : null}
    </div>
  );
}
