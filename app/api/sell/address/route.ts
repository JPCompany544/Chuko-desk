import { NextResponse } from "next/server";

import { BreetError, generateAddress } from "@/lib/breet";
import { jsonError, readBody } from "@/lib/http";
import { parseAddressInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = parseAddressInput(await readBody(request));
    if (!parsed.ok) throw new BreetError(parsed.message, 400);
    const address = await generateAddress(parsed.value);
    return NextResponse.json({ ok: true as const, address });
  } catch (error) {
    return jsonError(error);
  }
}
