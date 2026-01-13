import { describe, it, expect } from "jest";
import { AnalysisResponseSchema, VariableSchema } from "../lib/schemas";

describe("Analysis Schema Validation", () => {
  const validVariable = {
    key: "subject",
    label: "Subject",
    type: "text" as const,
    suggestedValue: "a person",
    confidence: 0.9,
  };

  const validAnalysis = {
    style_dna: "cinematic moody lighting",
    prompt_template: "A {subject} in {scene}",
    variables: [validVariable],
    negative_prompt: "blurry, low quality",
    recommended_settings: {
      aspect_ratio: "1:1",
    },
    palette: {
      name: "Warm",
      colors: ["#FF0000", "#00FF00"],
    },
    composition: {
      shot_type: "close-up",
      angle: "eye-level",
    },
    warnings: [],
  };

  it("should validate a correct variable", () => {
    expect(() => VariableSchema.parse(validVariable)).not.toThrow();
  });

  it("should validate a correct analysis response", () => {
    expect(() => AnalysisResponseSchema.parse(validAnalysis)).not.toThrow();
  });

  it("should reject variable with invalid confidence", () => {
    const invalid = { ...validVariable, confidence: 1.5 };
    expect(() => VariableSchema.parse(invalid)).toThrow();
  });

  it("should reject variable with missing required fields", () => {
    const invalid = { key: "test" };
    expect(() => VariableSchema.parse(invalid)).toThrow();
  });

  it("should reject analysis with invalid hex colors", () => {
    const invalid = {
      ...validAnalysis,
      palette: {
        name: "Test",
        colors: ["#GGGGGG"], // Invalid hex
      },
    };
    expect(() => AnalysisResponseSchema.parse(invalid)).toThrow();
  });

  it("should reject analysis with missing required fields", () => {
    const invalid = { style_dna: "test" };
    expect(() => AnalysisResponseSchema.parse(invalid)).toThrow();
  });

  it("should accept optional fields in composition", () => {
    const withOptional = {
      ...validAnalysis,
      composition: {
        ...validAnalysis.composition,
        focal_length_guess: "50mm",
        framing: "centered",
      },
    };
    expect(() => AnalysisResponseSchema.parse(withOptional)).not.toThrow();
  });

  it("should accept optional fields in recommended_settings", () => {
    const withOptional = {
      ...validAnalysis,
      recommended_settings: {
        ...validAnalysis.recommended_settings,
        steps: 50,
        guidance: 7.5,
        notes: "Some notes",
      },
    };
    expect(() => AnalysisResponseSchema.parse(withOptional)).not.toThrow();
  });
});
