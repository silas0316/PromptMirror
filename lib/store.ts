import { create } from "zustand";

interface AppState {
  // Image state
  imageId: string | null;
  previewUrl: string | null;
  
  // Analysis state
  analysis: {
    style_dna: string;
    prompt_template: string;
    variables: Array<{
      key: string;
      label: string;
      type: string;
      suggestedValue: string;
      lockedDefault?: boolean;
      confidence: number;
    }>;
    negative_prompt: string;
    recommended_settings: {
      aspect_ratio: string;
      steps?: number;
      guidance?: number;
      notes?: string;
    };
    palette: {
      name: string;
      colors: string[];
    };
    composition: {
      shot_type: string;
      angle: string;
      focal_length_guess?: string;
      framing?: string;
    };
    warnings: string[];
  } | null;
  
  // User edits
  variableValues: Record<string, string>;
  variableLocks: Record<string, boolean>;
  negativePrompt: string;
  
  // Settings
  preserveMode: "style" | "style+palette" | "style+composition";
  preserveStyle: number; // 0-100
  creativity: number; // 0-100
  aspectRatio: string;
  quality: "standard" | "hd";
  seed: string;
  
  // Generated images
  generatedImages: Array<{
    imageId: string;
    previewUrl: string;
    revisedPrompt?: string;
    diffSummary?: string;
  }>;
  
  // Loading states
  isAnalyzing: boolean;
  isRefining: boolean;
  isGenerating: boolean;
  analysisProgress: string;
  
  // Actions
  setImage: (imageId: string | null, previewUrl: string | null) => void;
  setAnalysis: (analysis: AppState["analysis"]) => void;
  setVariableValue: (key: string, value: string) => void;
  toggleVariableLock: (key: string) => void;
  setNegativePrompt: (prompt: string) => void;
  setPreserveMode: (mode: AppState["preserveMode"]) => void;
  setPreserveStyle: (value: number) => void;
  setCreativity: (value: number) => void;
  setAspectRatio: (ratio: string) => void;
  setQuality: (quality: "standard" | "hd") => void;
  setSeed: (seed: string) => void;
  addGeneratedImage: (image: AppState["generatedImages"][0]) => void;
  setAnalyzing: (isAnalyzing: boolean, progress?: string) => void;
  setRefining: (isRefining: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  reset: () => void;
}

const initialState = {
  imageId: null,
  previewUrl: null,
  analysis: null,
  variableValues: {},
  variableLocks: {},
  negativePrompt: "",
  preserveMode: "style" as const,
  preserveStyle: 80,
  creativity: 50,
  aspectRatio: "1:1",
  quality: "standard" as const,
  seed: "",
  generatedImages: [],
  isAnalyzing: false,
  isRefining: false,
  isGenerating: false,
  analysisProgress: "",
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setImage: (imageId, previewUrl) => set({ imageId, previewUrl }),
  
  setAnalysis: (analysis) => {
    if (!analysis) {
      set({ analysis: null, variableValues: {}, variableLocks: {} });
      return;
    }
    
    // Initialize variable values and locks
    const variableValues: Record<string, string> = {};
    const variableLocks: Record<string, boolean> = {};
    
    analysis.variables.forEach((v) => {
      variableValues[v.key] = v.suggestedValue;
      variableLocks[v.key] = v.lockedDefault ?? false;
    });
    
    // Always lock style_dna
    variableLocks.style_dna = true;
    
    set({
      analysis,
      variableValues,
      variableLocks,
      negativePrompt: analysis.negative_prompt,
      aspectRatio: analysis.recommended_settings.aspect_ratio,
    });
  },
  
  setVariableValue: (key, value) =>
    set((state) => ({
      variableValues: { ...state.variableValues, [key]: value },
    })),
  
  toggleVariableLock: (key) =>
    set((state) => ({
      variableLocks: {
        ...state.variableLocks,
        [key]: !state.variableLocks[key],
      },
    })),
  
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  
  setPreserveMode: (preserveMode) => set({ preserveMode }),
  
  setPreserveStyle: (preserveStyle) => set({ preserveStyle }),
  
  setCreativity: (creativity) => set({ creativity }),
  
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  
  setQuality: (quality) => set({ quality }),
  
  setSeed: (seed) => set({ seed }),
  
  addGeneratedImage: (image) =>
    set((state) => ({
      generatedImages: [...state.generatedImages, image],
    })),
  
  setAnalyzing: (isAnalyzing, progress = "") =>
    set({ isAnalyzing, analysisProgress: progress }),
  
  setRefining: (isRefining) => set({ isRefining }),
  
  setGenerating: (isGenerating) => set({ isGenerating }),
  
  reset: () => set(initialState),
}));
