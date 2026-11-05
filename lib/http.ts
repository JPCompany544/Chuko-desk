import "server-only";

import { NextResponse } from "next/server";

import { BreetError } from "@/lib/breet";
import { explainFailure } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof BreetError) {
    const status = error.status >= 400 && error.status <= 599 ? error.status : 502;
    return NextResponse.json(
      { ok: false as const, message: explainFailure(error.message, error.errors), errors: error.errors },
      { status },
    );
  }
  return NextResponse.json(
    { ok: false as const, message: "Unexpected desk error.", errors: [] },
    { status: 500 },
  );
}

export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BreetError("Invalid JSON body.", 400);
  }
}
