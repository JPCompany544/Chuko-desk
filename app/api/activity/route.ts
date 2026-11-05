import { NextResponse } from "next/server";

import { mapDeposits, mapWithdrawals, mergeActivity } from "@/lib/activity";
import { getActivity } from "@/lib/breet";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getActivity();
    const deposits = mapDeposits(raw.deposits);
    const withdrawals = mapWithdrawals(raw.withdrawals);
    return NextResponse.json({
      ok: true as const,
      items: mergeActivity(deposits, withdrawals),
    });
  } catch (error) {
    return jsonError(error);
  }
}
