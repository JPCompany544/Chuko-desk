import { NextResponse } from "next/server";

import { BreetError, mockTrade } from "@/lib/breet";
import { jsonError, readBody } from "@/lib/http";
import { parseMockTradeInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = parseMockTradeInput(await readBody(request));
    if (!parsed.ok) throw new BreetError(parsed.message, 400);
    const trade = await mockTrade(parsed.value);
    return NextResponse.json({ ok: true as const, trade });
  } catch (error) {
    return jsonError(error);
  }
}
