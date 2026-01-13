import { NextRequest, NextResponse } from "next/server";
import { getImageBuffer, getImageData } from "@/lib/image-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const imageId = params.imageId;
    const imageData = getImageData(imageId);

    if (!imageData) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buffer = await getImageBuffer(imageId);
    if (!buffer) {
      return NextResponse.json(
        { error: "Failed to read image" },
        { status: 500 }
      );
    }

    // Determine content type from extension
    const ext = imageId.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Image serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
