export type ApiResult<T> = ({ ok: true } & T) | { ok: false; message: string };

export async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return (await response.json()) as ApiResult<T>;
}

export async function getJson<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
  return (await response.json()) as ApiResult<T>;
}

export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${code}`;
  }
}

export function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
