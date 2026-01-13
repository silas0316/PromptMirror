"use client"

import { useState, useCallback, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Upload, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Copy, 
  Download, 
  Sparkles,
  Image as ImageIcon,
  AlertTriangle,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { mockAnalysis, delay, getMockImageUrl } from "@/lib/demo-data"

export default function Home() {
  const {
    imageId,
    previewUrl,
    analysis,
    variableValues,
    variableLocks,
    negativePrompt,
    preserveMode,
    preserveStyle,
    creativity,
    aspectRatio,
    quality,
    seed,
    generatedImages,
    isAnalyzing,
    isRefining,
    isGenerating,
    analysisProgress,
    setImage,
    setAnalysis,
    setVariableValue,
    toggleVariableLock,
    setNegativePrompt,
    setPreserveMode,
    setPreserveStyle,
    setCreativity,
    setAspectRatio,
    setQuality,
    setSeed,
    addGeneratedImage,
    setAnalyzing,
    setRefining,
    setGenerating,
    reset,
  } = useAppStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      toast.error("Invalid file type. Only PNG, JPG, and WEBP are allowed.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      setImage(data.imageId, data.previewUrl)
      toast.success("Image uploaded successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image")
    }
  }, [setImage])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleAnalyze = useCallback(async () => {
    if (!imageId) return

    setAnalyzing(true, "Extracting style...")
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, preserveMode }),
      })

      if (!response.ok) {
        const error = await response.json()
        // If API error, use demo mode
        if (error.error?.includes("quota") || error.error?.includes("429")) {
          toast.info("Using demo mode - API quota exceeded")
          setAnalyzing(true, "Building template...")
          await delay(1000)
          setAnalyzing(true, "Preparing suggestions...")
          await delay(500)
          setAnalysis(mockAnalysis)
          toast.success("Demo analysis complete! (Mock data)")
          setAnalyzing(false, "")
          return
        }
        throw new Error(error.error || "Analysis failed")
      }

      setAnalyzing(true, "Building template...")
      const analysisData = await response.json()
      
      setAnalyzing(true, "Preparing suggestions...")
      setAnalysis(analysisData)
      toast.success("Analysis complete!")
    } catch (error: any) {
      // Fallback to demo mode on any error
      if (error.message?.includes("quota") || error.message?.includes("429") || !error.message) {
        toast.info("Using demo mode - API unavailable")
        setAnalyzing(true, "Building template...")
        await delay(1000)
        setAnalyzing(true, "Preparing suggestions...")
        await delay(500)
        setAnalysis(mockAnalysis)
        toast.success("Demo analysis complete! (Mock data)")
      } else {
        toast.error(error.message || "Failed to analyze image")
      }
    } finally {
      setAnalyzing(false, "")
    }
  }, [imageId, preserveMode, setAnalyzing, setAnalysis])

  const handleRefine = useCallback(async () => {
    if (!imageId || !analysis) return

    setRefining(true)
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          preserveMode,
          locked: variableLocks,
          currentValues: variableValues,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        // If API error, use demo mode - just shuffle some values slightly
        if (error.error?.includes("quota") || error.error?.includes("429")) {
          toast.info("Using demo mode - API quota exceeded")
          await delay(1000)
          
          // In demo mode, just update unlocked variables with slight variations
          const updatedVariables = analysis.variables.map((v) => {
            if (!variableLocks[v.key] && v.key !== "style_dna") {
              return {
                ...v,
                suggestedValue: v.suggestedValue + " (refined)",
              }
            }
            return v
          })

          setAnalysis({
            ...analysis,
            variables: updatedVariables,
          })

          updatedVariables.forEach((v) => {
            if (!variableLocks[v.key]) {
              setVariableValue(v.key, v.suggestedValue)
            }
          })

          toast.success("Demo suggestions refined! (Mock data)")
          setRefining(false)
          return
        }
        throw new Error(error.error || "Refinement failed")
      }

      const refined = await response.json()
      
      // Update only unlocked variables
      const updatedVariables = analysis.variables.map((v) => {
        const refinedVar = refined.variables?.find((rv: any) => rv.key === v.key)
        if (refinedVar && !variableLocks[v.key]) {
          return refinedVar
        }
        return v
      })

      setAnalysis({
        ...analysis,
        variables: updatedVariables,
        prompt_template: refined.prompt_template || analysis.prompt_template,
      })

      // Update values for unlocked variables
      updatedVariables.forEach((v) => {
        if (!variableLocks[v.key]) {
          setVariableValue(v.key, v.suggestedValue)
        }
      })

      toast.success("Suggestions refined!")
    } catch (error: any) {
      // Fallback to demo mode
      if (error.message?.includes("quota") || error.message?.includes("429")) {
        toast.info("Using demo mode - API unavailable")
        await delay(1000)
        const updatedVariables = analysis.variables.map((v) => {
          if (!variableLocks[v.key] && v.key !== "style_dna") {
            return { ...v, suggestedValue: v.suggestedValue + " (refined)" }
          }
          return v
        })
        setAnalysis({ ...analysis, variables: updatedVariables })
        updatedVariables.forEach((v) => {
          if (!variableLocks[v.key]) {
            setVariableValue(v.key, v.suggestedValue)
          }
        })
        toast.success("Demo suggestions refined! (Mock data)")
      } else {
        toast.error(error.message || "Failed to refine suggestions")
      }
    } finally {
      setRefining(false)
    }
  }, [imageId, preserveMode, analysis, variableLocks, variableValues, setAnalysis, setVariableValue, setRefining])

  const handleGenerate = useCallback(async () => {
    if (!imageId || !analysis) return

    setGenerating(true)
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          preserveMode,
          values: variableValues,
          negativePrompt,
          settings: {
            aspect_ratio: aspectRatio,
            quality,
            seed: seed || undefined,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        // If API error, use demo mode
        if (error.error?.includes("quota") || error.error?.includes("429")) {
          toast.info("Using demo mode - API quota exceeded")
          await delay(2000) // Simulate generation time
          
          // Calculate diff summary
          const diffs: string[] = []
          analysis.variables.forEach((v) => {
            if (variableValues[v.key] !== v.suggestedValue) {
              diffs.push(`${v.label}: changed`)
            }
          })

          addGeneratedImage({
            imageId: `demo-${Date.now()}`,
            previewUrl: getMockImageUrl(),
            revisedPrompt: "Demo mode: This is a placeholder image. Real generation requires OpenAI API access.",
            diffSummary: diffs.join(", ") || "No changes",
          })

          toast.success("Demo image generated! (Mock data)")
          setGenerating(false)
          return
        }
        throw new Error(error.error || "Generation failed")
      }

      const data = await response.json()

      // Calculate diff summary
      const diffs: string[] = []
      analysis.variables.forEach((v) => {
        if (variableValues[v.key] !== v.suggestedValue) {
          diffs.push(`${v.label}: changed`)
        }
      })

      addGeneratedImage({
        imageId: data.outputImageId,
        previewUrl: data.outputUrl,
        revisedPrompt: data.revisedPrompt,
        diffSummary: diffs.join(", ") || "No changes",
      })

      toast.success("Image generated successfully!")
    } catch (error: any) {
      // Fallback to demo mode on any error
      if (error.message?.includes("quota") || error.message?.includes("429") || !error.message) {
        toast.info("Using demo mode - API unavailable")
        await delay(2000)
        
        const diffs: string[] = []
        analysis.variables.forEach((v) => {
          if (variableValues[v.key] !== v.suggestedValue) {
            diffs.push(`${v.label}: changed`)
          }
        })

        addGeneratedImage({
          imageId: `demo-${Date.now()}`,
          previewUrl: getMockImageUrl(),
          revisedPrompt: "Demo mode: This is a placeholder image.",
          diffSummary: diffs.join(", ") || "No changes",
        })
        toast.success("Demo image generated! (Mock data)")
      } else {
        toast.error(error.message || "Failed to generate image")
      }
    } finally {
      setGenerating(false)
    }
  }, [
    imageId,
    preserveMode,
    analysis,
    variableValues,
    negativePrompt,
    aspectRatio,
    quality,
    seed,
    addGeneratedImage,
    setGenerating,
  ])

  const handleCopyStyleDNA = useCallback(() => {
    if (analysis?.style_dna) {
      navigator.clipboard.writeText(analysis.style_dna)
      toast.success("Style DNA copied to clipboard")
    }
  }, [analysis])

  const handleUseAsReference = useCallback(
    (generatedImageId: string, generatedPreviewUrl: string) => {
      setImage(generatedImageId, generatedPreviewUrl)
      setAnalysis(null)
      toast.success("Image set as new reference")
    },
    [setImage, setAnalysis]
  )

  const handleResetVariable = useCallback(
    (key: string) => {
      const variable = analysis?.variables.find((v) => v.key === key)
      if (variable) {
        setVariableValue(key, variable.suggestedValue)
      }
    },
    [analysis, setVariableValue]
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">PromptMirror</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Extract style DNA from images and generate new variations
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    We generate best-guess recreation prompts, not the original prompt/seed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Reference Image Card */}
            <Card>
              <CardHeader>
                <CardTitle>Reference Image</CardTitle>
                <CardDescription>Upload an image to analyze its style</CardDescription>
              </CardHeader>
              <CardContent>
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                      <img
                        src={previewUrl}
                        alt="Reference"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImage(null, null)
                        setAnalysis(null)
                        reset()
                      }}
                      className="w-full"
                    >
                      Replace Image
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">
                      Drag & drop an image here, or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP up to 10MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFileSelect(file)
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preserve Mode */}
            {previewUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Preserve Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <SegmentedControl
                    options={[
                      { value: "style", label: "Style" },
                      { value: "style+palette", label: "Style + Palette" },
                      { value: "style+composition", label: "Style + Composition (Advanced)" },
                    ]}
                    value={preserveMode}
                    onChange={(value) =>
                      setPreserveMode(
                        value as "style" | "style+palette" | "style+composition"
                      )
                    }
                  />
                  {preserveMode === "style+composition" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Advanced composition matching is best-effort in MVP
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sliders */}
            {previewUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Generation Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Preserve Style</Label>
                      <span className="text-sm text-muted-foreground">{preserveStyle}</span>
                    </div>
                    <Slider
                      value={[preserveStyle]}
                      onValueChange={([value]) => setPreserveStyle(value)}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Creativity</Label>
                      <span className="text-sm text-muted-foreground">{creativity}</span>
                    </div>
                    <Slider
                      value={[creativity]}
                      onValueChange={([value]) => setCreativity(value)}
                      max={100}
                      step={1}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analyze Button */}
            {previewUrl && !analysis && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    {analysisProgress || "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Image
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Prompt Template */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Template</CardTitle>
                <CardDescription>Edit variables to customize the output</CardDescription>
              </CardHeader>
              <CardContent>
                {analysis ? (
                  <div className="space-y-4">
                    {analysis.variables.map((variable) => (
                      <div key={variable.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={variable.key}>{variable.label}</Label>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleResetVariable(variable.key)}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset to suggested</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleVariableLock(variable.key)}
                            >
                              {variableLocks[variable.key] ? (
                                <Lock className="h-3 w-3" />
                              ) : (
                                <Unlock className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <Input
                          id={variable.key}
                          value={variableValues[variable.key] || ""}
                          onChange={(e) => setVariableValue(variable.key, e.target.value)}
                          disabled={variableLocks[variable.key]}
                          placeholder={variable.suggestedValue}
                        />
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round(variable.confidence * 100)}%
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={handleRefine}
                      disabled={isRefining}
                      className="w-full"
                    >
                      {isRefining ? "Refining..." : "Regenerate Suggestions"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Upload and analyze an image to see the template</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Style DNA */}
            {analysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Style DNA</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyStyleDNA}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-muted p-3 rounded-md font-mono">
                    {analysis.style_dna}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Negative Prompt */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Negative Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Things to avoid in generation"
                  />
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:5">4:5</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quality</Label>
                    <Select value={quality} onValueChange={(v) => setQuality(v as "standard" | "hd")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hd">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Seed (optional)</Label>
                    <Input
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Leave empty for random"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {analysis && analysis.warnings.length > 0 && (
              <Card className="border-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {analysis.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            {analysis && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="mt-12 space-y-6">
            <Separator />
            <div>
              <h2 className="text-2xl font-bold mb-6">Generated Images</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((img, i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <div className="relative aspect-square w-full">
                        <img
                          src={img.previewUrl}
                          alt={`Generated ${i + 1}`}
                          className="w-full h-full object-contain rounded-t-lg"
                        />
                      </div>
                      <div className="p-4 space-y-3">
                        {img.diffSummary && (
                          <p className="text-xs text-muted-foreground">
                            Changes: {img.diffSummary}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = img.previewUrl
                              link.download = `promptmirror-${i + 1}.png`
                              link.click()
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUseAsReference(img.imageId, img.previewUrl)}
                          >
                            Use as Reference
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
