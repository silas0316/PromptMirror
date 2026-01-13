import OpenAI from "openai";
import { AnalysisResponse, Variable } from "./schemas";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeImage(
  imageBuffer: Buffer,
  preserveMode: "style" | "style+palette" | "style+composition"
): Promise<AnalysisResponse> {
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/jpeg"; // Assume JPEG for now

  const systemPrompt = `You are an expert at analyzing images and extracting their visual style DNA. Your task is to analyze a reference image and return a STRICT JSON object with the following structure:

{
  "style_dna": "A compact but descriptive string capturing the core visual style (e.g., 'cinematic moody lighting, high contrast, desaturated colors, film grain texture, shallow depth of field'). DO NOT name living artists.",
  "prompt_template": "A template string with placeholders like {subject}, {palette}, {lighting}, etc.",
  "variables": [
    {
      "key": "subject",
      "label": "Subject",
      "type": "text",
      "suggestedValue": "description of the main subject",
      "lockedDefault": false,
      "confidence": 0.9
    }
  ],
  "negative_prompt": "Things to avoid in generation",
  "recommended_settings": {
    "aspect_ratio": "1:1",
    "steps": 50,
    "guidance": 7.5,
    "notes": "Optional notes"
  },
  "palette": {
    "name": "Color palette name",
    "colors": ["#HEX1", "#HEX2", ...]
  },
  "composition": {
    "shot_type": "close-up",
    "angle": "eye-level",
    "focal_length_guess": "50mm",
    "framing": "centered"
  },
  "warnings": []
}

Requirements:
- Extract 6-10 editable variables (subject, palette, background, camera, mood, key props, etc.)
- Each variable must have a confidence score (0-1)
- Style DNA should be descriptive but compact
- Do NOT name living artists in style_dna
- Include palette colors as hex codes
- Include composition details
- Return ONLY valid JSON, no markdown formatting`;

  const userPrompt = `Analyze this image and extract its style DNA. Preserve mode: ${preserveMode}. Return the JSON object as specified.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Parse and validate the JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Sometimes the response might be wrapped in markdown code blocks
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  // Ensure style_dna is always locked
  if (parsed.variables) {
    parsed.variables = parsed.variables.map((v: Variable) => ({
      ...v,
      lockedDefault: v.key === "style_dna" ? true : v.lockedDefault ?? false,
    }));
  }

  return parsed as AnalysisResponse;
}

export async function refineAnalysis(
  imageBuffer: Buffer,
  preserveMode: "style" | "style+palette" | "style+composition",
  locked: Record<string, boolean>,
  currentValues: Record<string, string>
): Promise<{ variables: Variable[]; prompt_template: string }> {
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/jpeg";

  const lockedVars = Object.entries(locked)
    .filter(([_, isLocked]) => isLocked)
    .map(([key]) => ({ key, value: currentValues[key] }));

  const systemPrompt = `You are refining the analysis of an image. The user has locked some variables. Only refine the UNLOCKED variables. Return a JSON object with:
{
  "variables": [array of Variable objects, only for UNLOCKED variables],
  "prompt_template": "updated template string"
}

Keep locked variables exactly as they are.`;

  const userPrompt = `Refine the analysis for this image. Preserve mode: ${preserveMode}.
Locked variables (DO NOT change these): ${JSON.stringify(lockedVars)}
Current values: ${JSON.stringify(currentValues)}
Only return variables for UNLOCKED fields.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  return parsed;
}

export async function generateImage(
  imageBuffer: Buffer,
  finalPrompt: string,
  negativePrompt: string,
  settings: {
    aspect_ratio: string;
    quality: "standard" | "hd";
    seed?: string;
  }
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  // Build the structured prompt
  const structuredPrompt = finalPrompt;

  // For DALL-E 3, we need to use the image as a reference
  // Note: DALL-E 3 doesn't support image input directly, so we'll use the prompt
  // For a production system, you might want to use DALL-E 2 with image variations
  // or use a different model that supports image-to-image

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: structuredPrompt,
    size: settings.aspect_ratio === "1:1" ? "1024x1024" : 
          settings.aspect_ratio === "4:5" ? "1024x1280" : 
          settings.aspect_ratio === "16:9" ? "1792x1024" : "1024x1024",
    quality: settings.quality === "hd" ? "hd" : "standard",
    n: 1,
  });

  const imageUrl = response.data[0]?.url;
  const revisedPrompt = response.data[0]?.revised_prompt;

  if (!imageUrl) {
    throw new Error("Failed to generate image");
  }

  return { imageUrl, revisedPrompt };
}
