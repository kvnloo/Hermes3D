import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const buildId = process.env.HERMES3D_BUILD_ID?.trim() || "unknown";
  return NextResponse.json(
    {
      ok: true,
      service: "hermes3d",
      buildId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Hermes3D-Build": buildId,
      },
    },
  );
}
