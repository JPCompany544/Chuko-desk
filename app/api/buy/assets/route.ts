import { NextResponse } from "next/server";

import { FALLBACK_CATALOG } from "@/lib/catalog";
import { BreetError, getWithdrawalCatalog } from "@/lib/breet";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getWithdrawalCatalog();
    return NextResponse.json({ ok: true as const, catalog });
  } catch (error) {
    if (error instanceof BreetError && error.status === 503) {
      return NextResponse.json({ ok: true as const, catalog: FALLBACK_CATALOG });
    }
    return jsonError(error);
  }
}
