import { NextRequest, NextResponse } from "next/server";
import { refineAnalysis } from "@/lib/openai";
import { getImageBuffer } from "@/lib/image-storage";
import { RefineRequestSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = RefineRequestSchema.parse(body);

    const imageBuffer = await getImageBuffer(validated.imageId);
    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Refine the analysis
    const refined = await refineAnalysis(
      imageBuffer,
      validated.preserveMode,
      validated.locked,
      validated.currentValues
    );

    return NextResponse.json(refined);
  } catch (error: any) {
    console.error("Refine error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to refine analysis" },
      { status: 500 }
    );
  }
}
