import { z } from "zod";

// Analysis response schema
export const VariableSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "select"]),
  suggestedValue: z.string(),
  lockedDefault: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
});

export const AnalysisResponseSchema = z.object({
  style_dna: z.string(),
  prompt_template: z.string(),
  variables: z.array(VariableSchema),
  negative_prompt: z.string(),
  recommended_settings: z.object({
    aspect_ratio: z.string(),
    steps: z.number().optional(),
    guidance: z.number().optional(),
    notes: z.string().optional(),
  }),
  palette: z.object({
    name: z.string(),
    colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  }),
  composition: z.object({
    shot_type: z.string(),
    angle: z.string(),
    focal_length_guess: z.string().optional(),
    framing: z.string().optional(),
  }),
  warnings: z.array(z.string()),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type Variable = z.infer<typeof VariableSchema>;

// API request schemas
export const AnalyzeRequestSchema = z.object({
  imageId: z.string(),
  preserveMode: z.enum(["style", "style+palette", "style+composition"]),
});

export const RefineRequestSchema = z.object({
  imageId: z.string(),
  preserveMode: z.enum(["style", "style+palette", "style+composition"]),
  locked: z.record(z.string(), z.boolean()),
  currentValues: z.record(z.string(), z.string()),
});

export const GenerateRequestSchema = z.object({
  imageId: z.string(),
  preserveMode: z.enum(["style", "style+palette", "style+composition"]),
  values: z.record(z.string(), z.string()),
  negativePrompt: z.string(),
  settings: z.object({
    aspect_ratio: z.string(),
    quality: z.enum(["standard", "hd"]),
    seed: z.string().optional(),
  }),
});
