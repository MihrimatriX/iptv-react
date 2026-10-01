import { NextRequest, NextResponse } from "next/server";
import { getCategoriesWithStreams, XtreamApiError } from "@/lib/xtream";

export const dynamic = "force-dynamic";

// Per-user data: never let a CDN or the browser share it.
const NO_STORE = { "Cache-Control": "private, no-store" };

// POST so credentials travel in the body, not in URLs (which end up in logs).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const categories = await getCategoriesWithStreams(body?.credentials);
    return NextResponse.json({ categories }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof XtreamApiError) {
      const message =
        error.status === 401
          ? "Kimlik dogrulama basarisiz (401). Kullanici adi/sifre veya API URL'sini kontrol edin."
          : "Xtream API verilerine ulasilamadi";
      return NextResponse.json(
        { message, error: error.message, status: error.status },
        { status: error.status, headers: NO_STORE }
      );
    }
    return NextResponse.json(
      {
        message: "Xtream API verilerine ulasilamadi",
        error:
          error instanceof Error ? error.message : "Beklenmedik bir hata olustu",
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
