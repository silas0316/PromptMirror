import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/openai";
import { getImageBuffer, storeImage } from "@/lib/image-storage";
import { GenerateRequestSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCachedAnalysis } from "@/lib/analysis-cache";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

function buildFinalPrompt(
  styleDNA: string,
  variables: Record<string, string>,
  preserveMode: "style" | "style+palette" | "style+composition",
  template: string,
  negativePrompt: string
): string {
  // Replace template placeholders
  let prompt = template;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value);
  }

  // Build structured prompt based on preserve mode
  const sections: string[] = [];

  sections.push(`STYLE_DNA: ${styleDNA}`);

  if (preserveMode === "style+palette" && variables.palette) {
    sections.push(`PALETTE: ${variables.palette}`);
  }

  if (preserveMode === "style+composition" && variables.composition) {
    sections.push(`COMPOSITION: ${variables.composition}`);
  }

  if (variables.subject) {
    sections.push(`SUBJECT: ${variables.subject}`);
  }

  if (variables.scene) {
    sections.push(`SCENE: ${variables.scene}`);
  }

  if (variables.lighting) {
    sections.push(`LIGHTING: ${variables.lighting}`);
  }

  if (variables.camera) {
    sections.push(`CAMERA: ${variables.camera}`);
  }

  if (variables.mood) {
    sections.push(`MOOD: ${variables.mood}`);
  }

  if (variables.details) {
    sections.push(`DETAILS: ${variables.details}`);
  }

  // Add negative prompt
  if (negativePrompt) {
    sections.push(`NEGATIVE: ${negativePrompt}`);
  }

  return sections.join("\n");
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
    const validated = GenerateRequestSchema.parse(body);

    const imageBuffer = await getImageBuffer(validated.imageId);
    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Get the cached analysis
    const cachedAnalysis = getCachedAnalysis(validated.imageId);
    if (!cachedAnalysis) {
      return NextResponse.json(
        { error: "Analysis not found. Please analyze the image first." },
        { status: 400 }
      );
    }

    const styleDNA = cachedAnalysis.style_dna;
    const template = cachedAnalysis.prompt_template;

    // Build final prompt
    const finalPrompt = buildFinalPrompt(
      styleDNA,
      validated.values,
      validated.preserveMode,
      template,
      validated.negativePrompt
    );

    // Generate image
    const { imageUrl, revisedPrompt } = await generateImage(
      imageBuffer,
      finalPrompt,
      validated.negativePrompt,
      validated.settings
    );

    // Download and store the generated image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image");
    }

    const imageBufferGenerated = Buffer.from(await imageResponse.arrayBuffer());
    const { imageId: outputImageId, previewUrl: outputUrl } = await storeImage(
      imageBufferGenerated,
      "generated.png"
    );

    return NextResponse.json({
      outputImageId,
      outputUrl,
      revisedPrompt,
    });
  } catch (error: any) {
    console.error("Generation error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
