import { NextResponse } from "next/server";

import { getDepositAssets } from "@/lib/breet";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assets = await getDepositAssets();
    return NextResponse.json({ ok: true as const, assets });
  } catch (error) {
    return jsonError(error);
  }
}
