"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Notice } from "@/components/Notice";
import { getJson, postJson } from "@/lib/client";
import type { AddressResult, DepositAsset, DeskWallet, MockTradeResult } from "@/lib/types";

export function SellDesk() {
  const [assets, setAssets] = useState<DepositAsset[]>([]);
  const [wallets, setWallets] = useState<DeskWallet[]>([]);
  const [assetId, setAssetId] = useState("");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [amountInUSD, setAmountInUSD] = useState("50");
  const [cryptoReceived, setCryptoReceived] = useState("50");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [tradeResult, setTradeResult] = useState<MockTradeResult | null>(null);
  const [pendingAddress, setPendingAddress] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<{ assets: DepositAsset[] }>("/api/sell/assets")
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.message);
          return;
        }
        setAssets(result.assets);
        const first = result.assets.find((asset) => asset.isActive) ?? result.assets[0];
        if (first) {
          setAssetId(first.id);
          setIdentifier(first.identifier);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load deposit assets.");
      });
    getJson<{ wallets: DeskWallet[] }>("/api/sell/wallets")
      .then((result) => {
        if (!cancelled && result.ok) setWallets(result.wallets);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function selectAsset(id: string) {
    setAssetId(id);
    const asset = assets.find((entry) => entry.id === id);
    if (asset) setIdentifier(asset.identifier);
  }

  function chooseWallet(wallet: DeskWallet) {
    setAddress(wallet.address);
    setIdentifier(wallet.identifier);
    if (wallet.assetId) setAssetId(wallet.assetId);
    setAddressResult(null);
    setTradeResult(null);
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAddress(true);
    setAddressError(null);
    setAddressResult(null);
    try {
      const result = await postJson<{ address: AddressResult }>("/api/sell/address", {
        assetId,
        label,
      });
      if (!result.ok) {
        setAddressError(result.message);
        return;
      }
      setAddressResult(result.address);
      setAddress(result.address.address);
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

  const selected = assets.find((asset) => asset.id === assetId);

  return (
    <div className="stack">
      {loadError ? <Notice tone="error">{loadError}</Notice> : null}
      <div className="split">
        <form className="panel form" onSubmit={onGenerate}>
          <h2>Deposit address</h2>
          <label className="field">
            <span className="field-label">Asset</span>
            <select
              value={assetId}
              onChange={(event) => selectAsset(event.target.value)}
              required
            >
              {assets.length === 0 ? <option value="">Loading assets…</option> : null}
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id} disabled={!asset.isActive}>
                  {asset.name} · {asset.identifier}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {selected
                ? `${selected.network || selected.symbol}. Minimum deposit ${
                    selected.minimum ?? "—"
                  } USD.`
                : "Assets come from GET /trades/assets."}
            </span>
          </label>
          <label className="field">
            <span className="field-label">Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="customer-1042"
              autoComplete="off"
              required
            />
            <span className="field-hint">One label per asset. Reuse an existing wallet below if it already exists.</span>
          </label>
          <button className="btn btn-sell" type="submit" disabled={pendingAddress || !assetId}>
            {pendingAddress ? "Generating…" : "Generate address"}
          </button>
          {addressError ? <Notice tone="error">{addressError}</Notice> : null}
          {addressResult ? <Notice tone="ok">{addressResult.message}</Notice> : null}
        </form>

        <form className="panel form" onSubmit={onMock}>
          <h2>Mock trade</h2>
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
          <button className="btn btn-sell" type="submit" disabled={pendingTrade}>
            {pendingTrade ? "Submitting…" : "Mock deposit"}
          </button>
          {tradeError ? <Notice tone="error">{tradeError}</Notice> : null}
          {tradeResult ? (
            <div className="stack">
              <Notice tone="ok">{tradeResult.message}</Notice>
              <p className="quiet mono">{tradeResult.reference}</p>
              <p className="quiet mono">{tradeResult.txHash}</p>
            </div>
          ) : (
            <p className="quiet">
              Reference and tx hash are created on the server. Breet processes the mock deposit
              asynchronously.
            </p>
          )}
        </form>
      </div>

      {address ? (
        <section className="panel">
          <div className="row-actions">
            <h2>Address</h2>
            <button type="button" className="btn btn-ghost" onClick={copyAddress}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mono">{address}</p>
        </section>
      ) : null}

      <section className="panel">
        <h2>Existing wallets</h2>
        <p className="quiet">Select one to fill the mock-trade form.</p>
        {wallets.length === 0 ? (
          <p className="quiet">No wallets yet.</p>
        ) : (
          <ul className="wallet-list">
            {wallets.map((wallet) => (
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
    </div>
  );
}
