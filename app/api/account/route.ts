import { NextResponse } from "next/server";

import { getAccount } from "@/lib/breet";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await getAccount();
    return NextResponse.json({ ok: true as const, account });
  } catch (error) {
    return jsonError(error);
  }
}
