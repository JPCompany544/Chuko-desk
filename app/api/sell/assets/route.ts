import { NextResponse } from "next/server";

import { BreetError, breetEnv, getDepositAssets } from "@/lib/breet";
import { resolveDepositAssets } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = breetEnv();
  try {
    const resolved = resolveDepositAssets(await getDepositAssets(), env);
    return NextResponse.json({ ok: true as const, ...resolved });
  } catch (error) {
    const resolved = resolveDepositAssets(null, env);
    const message =
      error instanceof BreetError ? error.message : "Could not load live deposit assets.";
    return NextResponse.json({ ok: true as const, ...resolved, message });
  }
}
