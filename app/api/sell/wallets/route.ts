import { NextResponse } from "next/server";

import { getWallets } from "@/lib/breet";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getWallets();
    return NextResponse.json({ ok: true as const, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
