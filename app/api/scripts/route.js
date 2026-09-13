import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parsePathname(pathname, fallbackDate) {
  const base = pathname.replace(/^scripts\//, "");
  const [timestampStr, uploader, ...nameParts] = base.split("__");
  const timestamp = Number(timestampStr);
  return {
    name: nameParts.length ? nameParts.join("__") : base,
    uploader: uploader || "unknown",
    uploadedAt: Number.isFinite(timestamp) ? timestamp : fallbackDate,
  };
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "scripts/" });

    const scripts = blobs
      .map((b) => {
        const parsed = parsePathname(b.pathname, new Date(b.uploadedAt).getTime());
        return { url: b.url, ...parsed };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    return NextResponse.json({ scripts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
