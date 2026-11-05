import { NextResponse } from "next/server";

import { tokenFromCatalog } from "@/lib/catalog";
import { BreetError, getWithdrawalCatalog, withdrawStablecoin } from "@/lib/breet";
import { jsonError, readBody } from "@/lib/http";
import { parseBuyInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = parseBuyInput(await readBody(request));
    if (!parsed.ok) throw new BreetError(parsed.message, 400);

    const catalog = await getWithdrawalCatalog();
    const token = tokenFromCatalog(catalog, parsed.value.token);
    if (catalog.source === "breet") {
      if (!token?.enabled) {
        throw new BreetError(`${parsed.value.token} withdrawals are not enabled.`, 400);
      }
      const network = token.networks.find((entry) => entry.network === parsed.value.network);
      if (!network?.enabled) {
        throw new BreetError(
          `${parsed.value.network} is not enabled for ${parsed.value.token}.`,
          400,
        );
      }
      const { minimum, maximum } = catalog.limits;
      if (minimum !== null && parsed.value.amount < minimum) {
        throw new BreetError(`Amount is below the ${minimum} USD minimum.`, 400);
      }
      if (maximum !== null && parsed.value.amount > maximum) {
        throw new BreetError(`Amount is above the ${maximum} USD maximum.`, 400);
      }
    }

    const withdrawal = await withdrawStablecoin(parsed.value);
    return NextResponse.json({ ok: true as const, withdrawal });
  } catch (error) {
    return jsonError(error);
  }
}
