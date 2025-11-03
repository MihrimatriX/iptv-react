import { NextRequest, NextResponse } from "next/server";
import { getCategoriesWithStreams, XtreamApiError } from "@/lib/xtream";

export const revalidate = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const credentialsParam = request.nextUrl.searchParams.get("credentials");
    const credentials = credentialsParam
      ? JSON.parse(decodeURIComponent(credentialsParam))
      : undefined;

    const categories = await getCategoriesWithStreams(credentials);
    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=60" } }
    );
  } catch (error) {
    if (error instanceof XtreamApiError) {
      return NextResponse.json(
        {
          message: "Xtream API verilerine ulasilamadi",
          error: error.message,
          status: error.status,
        },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        message: "Xtream API verilerine ulasilamadi",
        error:
          error instanceof Error
            ? error.message
            : "Beklenmedik bir hata olustu",
      },
      { status: 500 }
    );
  }
}
