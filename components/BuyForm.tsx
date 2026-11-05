"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Notice } from "@/components/Notice";
import { getJson, postJson } from "@/lib/client";
import { FALLBACK_CATALOG } from "@/lib/catalog";
import type { BuyResult, StableToken, WithdrawalCatalog } from "@/lib/types";

export function BuyForm() {
  const [catalog, setCatalog] = useState<WithdrawalCatalog>(FALLBACK_CATALOG);
  const [token, setToken] = useState<StableToken>("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("25");
  const [walletAddress, setWalletAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuyResult | null>(null);

  useEffect(() => {
    getJson<{ catalog: WithdrawalCatalog }>("/api/buy/assets")
      .then((payload) => {
        if (!payload.ok) return;
        setCatalog(payload.catalog);
        const enabled = payload.catalog.tokens.find((entry) => entry.enabled);
        if (enabled) setToken(enabled.symbol);
      })
      .catch(() => undefined);
  }, []);

  const selected = useMemo(
    () => catalog.tokens.find((entry) => entry.symbol === token) ?? catalog.tokens[0],
    [catalog, token],
  );
  const networks = useMemo(
    () => selected?.networks.filter((entry) => entry.enabled) ?? [],
    [selected],
  );
  const activeNetwork =
    networks.find((entry) => entry.network === network)?.network ?? networks[0]?.network ?? "";
  const fee = networks.find((entry) => entry.network === activeNetwork)?.fee;
  const limits = catalog.limits;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const payload = await postJson<{ withdrawal: BuyResult }>("/api/buy", {
        token,
        network: activeNetwork,
        amount,
        walletAddress,
      });
      if (!payload.ok) {
        setError(payload.message);
        return;
      }
      setResult(payload.withdrawal);
    } catch {
      setError("Could not submit the withdrawal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack split">
      <form className="panel form" onSubmit={onSubmit}>
        <div className="field">
          <span className="field-label">Token</span>
          <div className="choices">
            {catalog.tokens.map((entry) => (
              <button
                key={entry.symbol}
                type="button"
                className="choice"
                aria-pressed={token === entry.symbol}
                disabled={!entry.enabled}
                onClick={() => setToken(entry.symbol)}
              >
                <strong>{entry.symbol}</strong>
                <span>{entry.enabled ? "Enabled" : "Disabled"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Network</span>
          <div className="choices">
            {networks.map((entry) => (
              <button
                key={entry.network}
                type="button"
                className="choice"
                aria-pressed={activeNetwork === entry.network}
                onClick={() => setNetwork(entry.network)}
              >
                <strong>{entry.network}</strong>
                <span>{entry.fee === null ? "Fee on Breet" : `Fee $${entry.fee}`}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">Amount (USD)</span>
          <input
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <span className="field-hint">
            {limits.minimum !== null || limits.maximum !== null
              ? `Breet limits: ${limits.minimum ?? "—"} to ${limits.maximum ?? "—"} USD.`
              : "USD value, up to 2 decimal places."}
            {fee !== null && fee !== undefined ? ` Network fee shown for ${activeNetwork}: $${fee}.` : ""}
          </span>
        </label>
        <label className="field">
          <span className="field-label">Destination wallet</span>
          <input
            name="walletAddress"
            autoComplete="off"
            spellCheck={false}
            placeholder="External address"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            required
          />
        </label>
        <button className="btn btn-buy" type="submit" disabled={pending || !activeNetwork}>
          {pending ? "Sending…" : `Withdraw ${token}`}
        </button>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </form>
      <aside className="panel stack">
        <h2>What gets sent</h2>
        <p className="quiet">
          The server calls POST /payments/withdraw/address with x-app-id, x-app-secret, and
          X-Breet-Env. The PIN is added from BREET_PIN and never returned.
        </p>
        {result ? (
          <div className="stack">
            <Notice tone="ok">{result.message}</Notice>
            <p className="quiet">
              Reference <span className="mono">{result.externalId}</span>
            </p>
            {result.id ? (
              <p className="quiet">
                Withdrawal <span className="mono">{result.id}</span>
              </p>
            ) : null}
            <p className="quiet">
              {result.amount} USD {result.token} on {result.network}
            </p>
          </div>
        ) : (
          <p className="quiet">A queued withdrawal shows its Breet id and the desk reference here.</p>
        )}
      </aside>
    </div>
  );
}
