import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/openai";
import { getImageBuffer } from "@/lib/image-storage";
import { AnalyzeRequestSchema, AnalysisResponseSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { cacheAnalysis } from "@/lib/analysis-cache";

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
    const validated = AnalyzeRequestSchema.parse(body);

    const imageBuffer = await getImageBuffer(validated.imageId);
    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Analyze the image
    const analysis = await analyzeImage(imageBuffer, validated.preserveMode);

    // Validate the response
    const validatedAnalysis = AnalysisResponseSchema.parse(analysis);

    // Cache the analysis
    cacheAnalysis(validated.imageId, validatedAnalysis);

    return NextResponse.json(validatedAnalysis);
  } catch (error: any) {
    console.error("Analysis error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
