import { NextResponse } from "next/server";

import { breetEnv } from "@/lib/breet";
import type { DeskMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  const env = breetEnv();
  const body: DeskMeta & { ok: true } = {
    ok: true,
    env,
    baseUrl: "https://api.breet.io/v1",
    mockTrades: env === "sandbox",
  };
  return NextResponse.json(body);
}
