"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, RefreshCw, AlertCircle, X } from "lucide-react"

interface Moment {
  timing: string
  title: string
  summary: string
  description: string
  cameraMovement: string
  audio: string
  imageUrl?: string
  isGenerating?: boolean
  hasError?: boolean
  errorMessage?: string
  customPrompt?: string
  fullPrompt?: string
  productIdentity?: string
}

interface Storyboard {
  audioStrategy: string
  musicStyle: string
  productIdentity?: string
  moments: Moment[]
}

type Step = "input" | "storyboard" | "video"

export function AdCreator() {
  const [step, setStep] = useState<Step>("input")
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null)
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [seedImageUrl, setSeedImageUrl] = useState<string | null>(null)
  const [masterSeed, setMasterSeed] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number | null>(null)
  const [videoProgress, setVideoProgress] = useState(0)
  const [currentTechInfo, setCurrentTechInfo] = useState(0)
  const [storyboardProgress, setStoryboardProgress] = useState(0)
  const [storyboardGenerationStartTime, setStoryboardGenerationStartTime] = useState<number | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (step === "input" && promptRef.current) {
      promptRef.current.focus()
    }
  }, [step])

  useEffect(() => {
    if (isGeneratingVideo && !videoUrl && videoGenerationStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - videoGenerationStartTime) / 1000)
        const estimated = 120 // 2 minutes
        const progress = Math.min(100, Math.floor((elapsed / estimated) * 100))
        setVideoProgress(progress)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isGeneratingVideo, videoUrl, videoGenerationStartTime])

  useEffect(() => {
    if (isGeneratingVideo && !videoUrl) {
      const interval = setInterval(() => {
        setCurrentTechInfo((prev) => (prev + 1) % 4)
      }, 7000) // Change message every 7 seconds

      return () => clearInterval(interval)
    }
  }, [isGeneratingVideo, videoUrl])

  useEffect(() => {
    if ((isGeneratingStoryboard || isGeneratingImages) && storyboardGenerationStartTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - storyboardGenerationStartTime) / 1000 // seconds

        // Total expected time: ~20 seconds
        // 0-5s: Storyboard (0-30%)
        // 5-20s: Images (30-95%)
        // 20s+: Final (95-100%)

        let progress = 0
        if (elapsed < 5) {
          // Storyboard phase: 0-30% over 5 seconds
          progress = (elapsed / 5) * 30
        } else if (elapsed < 20) {
          // Image generation phase: 30-95% over 15 seconds
          progress = 30 + ((elapsed - 5) / 15) * 65
        } else {
          // Final phase: 95-100%
          progress = 95 + Math.min((elapsed - 20) / 2, 1) * 5
        }

        setStoryboardProgress(Math.min(99, Math.floor(progress)))
      }, 100)

      return () => clearInterval(interval)
    } else if (!isGeneratingStoryboard && !isGeneratingImages) {
      // Reset when generation completes
      setStoryboardProgress(0)
      setStoryboardGenerationStartTime(null)
    }
  }, [isGeneratingStoryboard, isGeneratingImages, storyboardGenerationStartTime])

  const styles = [
    { value: "luxury", label: "Luxury", description: "Premium, elegant, sophisticated" },
    { value: "minimal", label: "Minimal", description: "Clean, modern, tech" },
    { value: "retro", label: "Retro", description: "Vintage, nostalgic, 80s/90s" },
    { value: "cinematic", label: "Cinematic", description: "Epic storytelling, dramatic" },
    { value: "direct-to-camera", label: "Direct to Camera", description: "Person speaking, authentic" },
  ]

  const handleLoadDemo = () => {
    const demoStoryboard: Storyboard = {
      audioStrategy: "Voiceover and music with dialogue and SFX",
      musicStyle: "Upbeat 1960s surf rock with electric guitar riffs and energetic drums",
      productIdentity: "Red Porsche 911 sports car with iconic curved design and silver wheels",
      moments: [
        {
          timing: "[00:00-00:03]",
          title: "Opening Hook",
          summary: "Red Porsche speeds down scenic coastal highway dramatically",
          description: "A sleek red Porsche 911 speeds down a winding coastal highway with ocean views",
          cameraMovement: "Dynamic tracking shot",
          audio: "Engine roar with surf rock intro",
          imageUrl: "https://fal.media/files/lion/example1.jpg",
          fullPrompt:
            "A sleek red Porsche 911 speeds down a winding coastal highway with ocean views, dynamic tracking shot, cinematic lighting",
          productIdentity: "Red Porsche 911 sports car with iconic curved design and silver wheels",
        },
        {
          timing: "[00:03-00:06]",
          title: "Product Showcase",
          summary: "Close-up reveals Porsche's elegant design and craftsmanship details",
          description: "Close-up of the Porsche's elegant curves and premium interior details",
          cameraMovement: "Slow pan across vehicle",
          audio: "Music builds with voiceover",
          imageUrl: "https://fal.media/files/lion/example2.jpg",
          fullPrompt:
            "Close-up of a red Porsche 911's elegant curves and premium leather interior details, slow pan, luxury automotive photography",
          productIdentity: "Red Porsche 911 sports car with iconic curved design and silver wheels",
        },
        {
          timing: "[00:06-00:08]",
          title: "Closing Message",
          summary: "Porsche drives into sunset with brand message revealed",
          description: "The Porsche drives into a golden sunset on a coastal highway with the brand logo appearing",
          cameraMovement: "Wide establishing shot",
          audio: "Music crescendo with tagline",
          imageUrl: "https://fal.media/files/lion/example3.jpg",
          fullPrompt:
            "A red Porsche 911 drives into a golden sunset on a coastal highway, wide cinematic shot, dramatic lighting with lens flare",
          productIdentity: "Red Porsche 911 sports car with iconic curved design and silver wheels",
        },
      ],
    }

    setPrompt("A luxury red Porsche 911 sports car")
    setSelectedStyle("cinematic")
    setStoryboard(demoStoryboard)
    setSeedImageUrl(demoStoryboard.moments[0].imageUrl)
    setStep("storyboard")
  }

  const handleLoadDemoWithVideo = () => {
    handleLoadDemo()
    setTimeout(() => {
      setVideoUrl("https://fal.media/files/lion/demo-video.mp4")
      setStep("video")
    }, 500)
  }

  const handleGenerateStoryboard = async () => {
    if (!prompt.trim() || !selectedStyle) return

    setStep("storyboard")
    setIsGeneratingStoryboard(true)
    setIsGeneratingImages(true)
    setSeedImageUrl(null)
    setMasterSeed(null)
    setStoryboardProgress(0)
    setStoryboardGenerationStartTime(Date.now())

    const skeletonStoryboard: Storyboard = {
      audioStrategy: "",
      musicStyle: "",
      productIdentity: "",
      moments: [
        {
          timing: "[00:00-00:03]",
          title: "Opening Hook",
          summary: "",
          description: "",
          cameraMovement: "",
          audio: "",
          productIdentity: "",
        },
        {
          timing: "[00:00-00:06]",
          title: "Product Showcase",
          summary: "",
          description: "",
          cameraMovement: "",
          audio: "",
          productIdentity: "",
        },
        {
          timing: "[00:06-00:08]",
          title: "Closing Message",
          summary: "",
          description: "",
          cameraMovement: "",
          audio: "",
          productIdentity: "",
        },
      ],
    }
    setStoryboard(skeletonStoryboard)

    try {
      const response = await fetch("/api/generate-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
        }),
      })

      const data = await response.json()
      setStoryboard(data)

      handleGenerateAllImages(data)
    } catch (error) {
      console.error("Error generating storyboard:", error)
      setStep("input")
      setIsGeneratingImages(false)
    } finally {
      setIsGeneratingStoryboard(false)
    }
  }

  const handleRegenerateMoment = async (index: number) => {
    if (!storyboard) return

    setStoryboard((prevStoryboard) => {
      if (!prevStoryboard) return null
      const updatedMoments = [...prevStoryboard.moments]
      updatedMoments[index] = { ...updatedMoments[index], isGenerating: true }
      return { ...prevStoryboard, moments: updatedMoments }
    })

    try {
      const response = await fetch("/api/generate-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          regenerateMoment: index,
        }),
      })

      const data = await response.json()
      const newMoment = data.moments[index]

      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const updatedMoments = [...prevStoryboard.moments]
        updatedMoments[index] = { ...newMoment, isGenerating: false }
        return { ...prevStoryboard, moments: updatedMoments }
      })
    } catch (error) {
      console.error("Error regenerating moment:", error)
      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const errorMoments = [...prevStoryboard.moments]
        errorMoments[index] = { ...errorMoments[index], isGenerating: false }
        return { ...prevStoryboard, moments: errorMoments }
      })
    }
  }

  const handleGenerateMomentImage = async (
    index: number,
    seedImage: string | null = null,
    currentStoryboard?: Storyboard,
  ) => {
    const activeStoryboard = currentStoryboard || storyboard
    if (!activeStoryboard) return null

    setStoryboard((prevStoryboard) => {
      if (!prevStoryboard) return null
      const updatedMoments = [...prevStoryboard.moments]
      updatedMoments[index] = {
        ...updatedMoments[index],
        isGenerating: true,
        hasError: false,
        errorMessage: undefined,
      }
      return { ...prevStoryboard, moments: updatedMoments }
    })

    try {
      const response = await fetch("/api/generate-moment-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: activeStoryboard.moments[index].customPrompt || activeStoryboard.moments[index].description,
          seedImageUrl: seedImage,
          productDescription: prompt,
          style: selectedStyle,
          productIdentity: activeStoryboard.productIdentity || activeStoryboard.moments[index].productIdentity,
          seed: masterSeed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()

      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const finalMoments = [...prevStoryboard.moments]
        finalMoments[index] = {
          ...finalMoments[index],
          imageUrl: data.imageUrl,
          fullPrompt: data.fullPrompt,
          isGenerating: false,
          hasError: false,
          errorMessage: undefined,
        }
        return { ...prevStoryboard, moments: finalMoments }
      })

      return data.imageUrl
    } catch (error) {
      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const errorMoments = [...prevStoryboard.moments]
        errorMoments[index] = {
          ...errorMoments[index],
          isGenerating: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : "Failed to generate image",
        }
        return { ...prevStoryboard, moments: errorMoments }
      })
      return null
    }
  }

  const handleGenerateAllImages = async (currentStoryboard?: Storyboard) => {
    const activeStoryboard = currentStoryboard || storyboard
    if (!activeStoryboard) return

    setIsGeneratingImages(true)

    try {
      // Generate Opening Hook first - this becomes our visual reference
      const openingHookImage = await handleGenerateMomentImage(0, null, activeStoryboard)

      if (!openingHookImage) {
        setIsGeneratingImages(false)
        return
      }

      setSeedImageUrl(openingHookImage)

      // Generate a master seed for consistency
      const generatedSeed = `brand-consistency-${Date.now()}`
      setMasterSeed(generatedSeed)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate Product Showcase using Opening Hook as reference
      const productShowcaseImage = await handleGenerateMomentImage(1, openingHookImage, activeStoryboard)

      if (!productShowcaseImage) {
        setIsGeneratingImages(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate Closing Message using Product Showcase as reference
      await handleGenerateMomentImage(2, productShowcaseImage, activeStoryboard)
    } catch (error) {
      console.error("Error in automatic generation:", error)
    } finally {
      setIsGeneratingImages(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!storyboard) return

    const allImagesGenerated = storyboard.moments.every((m) => m.imageUrl)
    if (!allImagesGenerated) {
      return
    }

    setStep("video")
    setIsGeneratingVideo(true)
    setVideoUrl(null)
    setVideoGenerationStartTime(Date.now())
    setVideoProgress(0)

    try {
      const images = storyboard.moments.map((m) => m.imageUrl)

      // Only send essential data needed for video generation
      const optimizedStoryboard = {
        audioStrategy: storyboard.audioStrategy,
        musicStyle: storyboard.musicStyle,
        productIdentity: storyboard.productIdentity,
        moments: storyboard.moments.map((moment) => ({
          timing: moment.timing,
          description: moment.summary || moment.description,
          cameraMovement: moment.cameraMovement,
          audio: moment.audio,
        })),
      }

      // Prepare request body with optimized storyboard
      const requestBody = {
        storyboard: optimizedStoryboard,
        images,
        productDescription: prompt,
        style: selectedStyle,
      }

      const requestBodyString = JSON.stringify(requestBody)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 180000) // 3 minute client timeout

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBodyString,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: "Failed to generate video", details: errorText }
        }

        throw new Error(errorData.details || errorData.error || "Failed to generate video")
      }

      const responseText = await response.text()

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error("Invalid JSON response from server")
      }

      setVideoUrl(data.videoUrl)
      setVideoProgress(100)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          alert(
            "Video generation timed out after 3 minutes. This might be due to Vercel plan limitations or network issues.",
          )
        } else {
          alert(`Video generation failed: ${error.message}`)
        }
      } else {
        alert("Video generation failed with an unknown error.")
      }

      setStep("storyboard")
    } finally {
      setIsGeneratingVideo(false)
      setVideoGenerationStartTime(null)
    }
  }

  const handleRegenerateKeyframe = async (index: number) => {
    if (!storyboard) return

    setStoryboard((prevStoryboard) => {
      if (!prevStoryboard) return null
      const updatedMoments = [...prevStoryboard.moments]
      updatedMoments[index] = { ...updatedMoments[index], isGenerating: true }
      return { ...prevStoryboard, moments: updatedMoments }
    })

    try {
      const moment = storyboard.moments[index]
      const description =
        moment.customPrompt !== undefined ? moment.customPrompt : moment.fullPrompt || moment.description

      // Use appropriate seed image based on position
      let seedImage = null
      if (index === 0) {
        seedImage = null
      } else if (index === 1) {
        seedImage = storyboard.moments[0]?.imageUrl || seedImageUrl
      } else if (index === 2) {
        seedImage = storyboard.moments[1]?.imageUrl || seedImageUrl
      }

      const response = await fetch("/api/generate-moment-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          seedImageUrl: seedImage,
          productDescription: prompt,
          style: selectedStyle,
          productIdentity: storyboard.productIdentity || moment.productIdentity,
          seed: masterSeed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()

      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const finalMoments = [...prevStoryboard.moments]
        finalMoments[index] = {
          ...finalMoments[index],
          imageUrl: data.imageUrl,
          fullPrompt: data.fullPrompt,
          isGenerating: false,
        }
        return { ...prevStoryboard, moments: finalMoments }
      })

      // Update seed image if regenerating Opening Hook
      if (index === 0) {
        setSeedImageUrl(data.imageUrl)
      }

      setEditingPromptIndex(null)
    } catch (error) {
      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const errorMoments = [...prevStoryboard.moments]
        errorMoments[index] = { ...errorMoments[index], isGenerating: false }
        return { ...prevStoryboard, moments: errorMoments }
      })
    }
  }

  const handleUpdateCustomPrompt = (index: number, customPrompt: string) => {
    setStoryboard((prevStoryboard) => {
      if (!prevStoryboard) return null
      const updatedMoments = [...prevStoryboard.moments]
      updatedMoments[index] = { ...updatedMoments[index], customPrompt }
      return { ...prevStoryboard, moments: updatedMoments }
    })
  }

  const handleUpdateSummary = (index: number, summary: string) => {
    setStoryboard((prevStoryboard) => {
      if (!prevStoryboard) return null
      const updatedMoments = [...prevStoryboard.moments]
      updatedMoments[index] = { ...updatedMoments[index], summary }
      return { ...prevStoryboard, moments: updatedMoments }
    })
  }

  const handleKeyframeImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Show loading state
      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const updatedMoments = [...prevStoryboard.moments]
        updatedMoments[index] = { ...updatedMoments[index], isGenerating: true }
        return { ...prevStoryboard, moments: updatedMoments }
      })

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload image")
      }

      const data = await response.json()

      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const updatedMoments = [...prevStoryboard.moments]
        updatedMoments[index] = {
          ...updatedMoments[index],
          imageUrl: data.imageUrl,
          isGenerating: false,
        }
        return { ...prevStoryboard, moments: updatedMoments }
      })

      if (index === 0) {
        setSeedImageUrl(data.imageUrl)
      }
    } catch (error) {
      setStoryboard((prevStoryboard) => {
        if (!prevStoryboard) return null
        const updatedMoments = [...prevStoryboard.moments]
        updatedMoments[index] = {
          ...updatedMoments[index],
          isGenerating: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : "Failed to upload image",
        }
        return { ...prevStoryboard, moments: updatedMoments }
      })
    }
  }

  const allImagesReady = storyboard?.moments.every((m) => m.imageUrl && !m.isGenerating)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, action: () => void) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      action()
    }
  }

  if (step === "input") {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-[#0071e3]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-gradient-to-tl from-[#00d4ff]/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="w-full max-w-3xl mx-auto rounded-[2.5rem] p-4 md:p-8 relative z-10">
          <div className="text-center space-y-3 md:space-y-4 apple-animate-in">
            <div className="space-y-1">
              <h1
                className="text-5xl md:text-[5rem] font-black tracking-tighter text-white leading-[0.85] mb-2"
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
              >
                VIBE
              </h1>
              <h2
                className="text-xl md:text-[2.2rem] font-light italic tracking-wide text-zinc-300 leading-none -mt-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Video Ads
              </h2>
            </div>
            <p
              className="text-xs md:text-sm text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed pt-3 px-4 md:px-0"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              With Claude Sonnet 4.5 + Nano Banana + Veo 3.1 to create stunning 8-second video ads
            </p>
          </div>

          <div className="space-y-5 md:space-y-6 mt-8 md:mt-10 apple-animate-in apple-animate-delay-1">
            <div className="space-y-2">
              <Textarea
                ref={promptRef}
                placeholder="Describe your product or service..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleGenerateStoryboard)}
                rows={3}
                className="resize-none bg-zinc-900/80 border-2 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all duration-300 text-sm md:text-base rounded-3xl backdrop-blur-xl px-4 md:px-5 py-3"
                style={{ fontFamily: "system-ui, sans-serif" }}
              />
              <p className="text-xs text-zinc-400 text-right font-light tracking-wide">Press ⌘+Enter to generate</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs md:text-sm text-zinc-300 font-semibold tracking-wide uppercase">Select Style</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {styles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`group px-2 sm:px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm rounded-2xl transition-all duration-300 ease-out cursor-pointer border-2 ${
                      selectedStyle === style.value
                        ? "text-white bg-[#0071e3] border-[#0071e3] shadow-md shadow-[#0071e3]/20"
                        : "text-zinc-300 bg-zinc-900/50 border-zinc-700/50 hover:text-white hover:border-zinc-600 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="font-bold text-xs md:text-sm tracking-wide leading-tight">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4 md:pt-6">
              <Button
                onClick={handleGenerateStoryboard}
                disabled={!prompt.trim() || !selectedStyle || isGeneratingStoryboard}
                className="w-full sm:w-auto bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all duration-200 h-11 md:h-12 text-sm md:text-base rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-10 md:px-12"
              >
                {isGeneratingStoryboard ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          <footer className="mt-8 md:mt-12 py-4 text-center text-xs text-zinc-500 space-x-3 md:space-x-4 font-light apple-animate-in apple-animate-delay-2">
            <a
              href="https://v0.app/templates/ai-ad-creator-7JdqEwKmtIG"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200 tracking-wide"
            >
              open in v0
            </a>
            <span>&middot;</span>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="hover:text-white transition-colors duration-200 tracking-wide"
            >
              how it works
            </button>
            <span>&middot;</span>
            <a
              href="https://x.com/estebansuarez"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200 tracking-wide"
            >
              feedback? send me a dm!
            </a>
          </footer>
        </div>

        <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <DialogContent
            className="max-w-2xl border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-8"
            showCloseButton={false}
          >
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute right-6 top-6 rounded-full p-2 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">How It Works</h2>
              <div className="space-y-5 text-zinc-300">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      1
                    </span>
                    Describe Your Vision
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Simply describe your product or service in natural language and select a visual style. No technical
                    knowledge required—just tell us what you want to showcase.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      2
                    </span>
                    AI Creates Your Storyboard
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Claude Sonnet 4.5 analyzes your description and generates a professional 3-scene narrative with
                    precise timing (8 seconds total), camera movements, audio strategy, and scene descriptions optimized
                    for maximum impact.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      3
                    </span>
                    Generate Consistent Keyframes
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Nano Banana creates 3 high-quality reference images with perfect brand consistency. Each keyframe
                    maintains exact product details, colors, and style across all scenes—you can edit prompts or upload
                    your own images for full control.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      4
                    </span>
                    Bring It to Life with Video
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Google's Veo 3.1 transforms your storyboard and keyframes into a polished 8-second video with
                    cinematic camera movements, synchronized sound effects, background music, and smooth scene
                    transitions—all automatically generated.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Review and customize each step before moving forward. Edit scene descriptions, regenerate individual
                  keyframes, or upload your own images to ensure your final video perfectly matches your vision.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (step === "storyboard") {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-5xl mx-auto rounded-[2.5rem] p-4 md:p-8 lg:p-12">
          <div className="text-center space-y-3 md:space-y-4 apple-animate-in">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Review</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">Storyboard</h2>
            <p className="text-base md:text-lg text-zinc-400 font-normal px-4 md:px-0">
              Review and edit your 8-second ad
            </p>

            <div className="flex justify-center pt-4 gap-3">
              <Button
                onClick={() => setStep("input")}
                className="bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 rounded-full px-6 md:px-8 py-2.5 text-sm transition-all duration-200"
              >
                Back
              </Button>
            </div>
          </div>

          <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-white/20 bg-black rounded-3xl overflow-hidden">
              {fullscreenImage && (
                <img
                  src={fullscreenImage || "/placeholder.svg"}
                  alt="Fullscreen"
                  className="w-full h-full object-contain"
                  onClick={() => setFullscreenImage(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          {(isGeneratingStoryboard || isGeneratingImages) && (
            <div className="mt-8 w-full max-w-2xl mx-auto space-y-3 apple-animate-in">
              <div className="flex items-center justify-between text-sm">
                <p className="text-white font-medium">
                  {isGeneratingStoryboard ? "Generating storyboard..." : "Generating images..."}
                </p>
                <p className="text-zinc-400">{storyboardProgress}%</p>
              </div>
              <div className="w-full h-2 bg-zinc-700/50 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out rounded-full shadow-lg shadow-primary/50"
                  style={{ width: `${storyboardProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center">
                {isGeneratingStoryboard
                  ? "Claude is creating your storyboard..."
                  : `Nano Banana is generating ${storyboard?.moments.filter((m) => m.imageUrl).length || 0}/3 images...`}
              </p>
            </div>
          )}

          {storyboard && (
            <div className="mt-8 md:mt-10 apple-animate-in apple-animate-delay-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {storyboard.moments.map((moment, index) => (
                  <div
                    key={index}
                    className="bg-zinc-900/60 backdrop-blur-2xl rounded-3xl p-4 md:p-5 flex flex-col space-y-4 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-zinc-700/50"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm text-white font-semibold">
                          {index + 1}. {moment.title}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-zinc-500 font-normal">{moment.timing}</span>
                        </div>
                      </div>
                      {isGeneratingStoryboard && !moment.summary ? (
                        <div className="space-y-2">
                          <div className="h-[3rem] bg-zinc-800/50 animate-pulse rounded-xl" />
                          <p className="text-xs text-zinc-400 text-center font-normal">
                            Claude is writing Keyframe {index + 1}...
                          </p>
                        </div>
                      ) : (
                        <Textarea
                          value={moment.summary || moment.description}
                          onChange={(e) => handleUpdateSummary(index, e.target.value)}
                          rows={2}
                          className="resize-y min-h-[3rem] text-xs bg-zinc-800/80 border border-zinc-700/50 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-text rounded-xl"
                          placeholder="Edit scene description..."
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="w-full">
                        {moment.imageUrl ? (
                          <img
                            src={moment.imageUrl || "/placeholder.svg"}
                            alt={moment.title}
                            className="w-full rounded-2xl aspect-video object-cover cursor-pointer hover:opacity-90 transition-all shadow-lg border border-zinc-700/30"
                            onClick={() => setFullscreenImage(moment.imageUrl)}
                          />
                        ) : moment.isGenerating ? (
                          <div className="w-full rounded-2xl aspect-video bg-zinc-900/50 flex flex-col items-center justify-center gap-2 border border-zinc-700/30">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                            <p className="text-xs text-zinc-400 text-center px-4 font-normal">
                              Nano Banana is generating {index === 0 ? "seed image" : `image ${index + 1}`}...
                            </p>
                          </div>
                        ) : moment.hasError ? (
                          <div className="w-full rounded-2xl aspect-video bg-red-950/20 flex flex-col items-center justify-center gap-3 border-2 border-red-900/50 p-4">
                            <AlertCircle className="h-8 w-8 text-red-400" />
                            <p className="text-xs text-red-300 text-center font-normal">
                              {moment.errorMessage || "Failed to generate image"}
                            </p>
                            <Button
                              onClick={() => handleRegenerateKeyframe(index)}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs rounded-full font-semibold transition-all duration-200"
                            >
                              Retry Generation
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full rounded-2xl aspect-video bg-zinc-900/50 animate-pulse flex items-center justify-center border border-zinc-700/30">
                            <p className="text-xs text-zinc-400 text-center px-4 font-normal">
                              Keyframe {index + 1} will appear here
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="w-full">
                        {editingPromptIndex === index ? (
                          <div className="space-y-3">
                            <Textarea
                              value={
                                moment.customPrompt !== undefined
                                  ? moment.customPrompt
                                  : moment.fullPrompt || moment.description
                              }
                              onChange={(e) => handleUpdateCustomPrompt(index, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, () => handleRegenerateKeyframe(index))}
                              rows={2}
                              className="resize-none text-xs bg-zinc-800/80 border border-zinc-700/50 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 rounded-xl"
                              placeholder="Edit prompt..."
                            />
                            <p className="text-xs text-zinc-500 text-center font-normal">⌘+Enter</p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleRegenerateKeyframe(index)}
                                disabled={moment.isGenerating}
                                size="sm"
                                className="flex-1 bg-[#0071e3] hover:bg-[#0077ed] text-white h-9 text-xs rounded-full font-semibold transition-all duration-200"
                              >
                                {moment.isGenerating ? "Generating..." : "Regenerate"}
                              </Button>
                              <Button
                                onClick={() => setEditingPromptIndex(null)}
                                size="sm"
                                className="bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 h-9 w-20 md:w-24 rounded-full transition-all duration-200"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : moment.imageUrl ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingPromptIndex(index)}
                                size="sm"
                                className="flex-1 bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 h-9 text-xs rounded-full transition-all duration-200"
                              >
                                Edit prompt
                              </Button>
                              <Button
                                onClick={() => handleRegenerateKeyframe(index)}
                                disabled={moment.isGenerating}
                                size="sm"
                                className="bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 h-9 w-9 rounded-full transition-all duration-200"
                                title="Regenerate image"
                              >
                                {moment.isGenerating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                            <div>
                              <Button
                                onClick={() => fileInputRefs.current[index]?.click()}
                                size="sm"
                                className="w-full bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 h-9 text-xs rounded-full transition-all duration-200"
                              >
                                Upload
                              </Button>
                              <Input
                                ref={(el) => (fileInputRefs.current[index] = el)}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleKeyframeImageUpload(index, e)}
                                className="hidden"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {allImagesReady && (
                <div className="flex justify-center pt-6 md:pt-8 apple-animate-in apple-animate-delay-3">
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo}
                    className="w-full sm:w-auto bg-[#0071e3] hover:bg-[#0077ed] text-white h-11 md:h-12 text-sm md:text-base rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-10 md:px-12"
                  >
                    {isGeneratingVideo ? "Generating Video..." : "Generate Video"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mt-8 md:mt-12 py-4 md:py-6 text-center text-xs md:text-sm text-zinc-500 space-x-4 md:space-x-6 font-normal apple-animate-in apple-animate-delay-4">
          <a
            href="https://v0.app/templates/ai-ad-creator-7JdqEwKmtIG"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            open in v0
          </a>
          <span>&middot;</span>
          <button onClick={() => setShowHowItWorks(true)} className="hover:text-white transition-colors duration-200">
            how it works
          </button>
          <span>&middot;</span>
          <a
            href="https://x.com/estebansuarez"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            feedback? send me a dm!
          </a>
        </footer>

        <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <DialogContent
            className="max-w-2xl border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-8"
            showCloseButton={false}
          >
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute right-6 top-6 rounded-full p-2 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">How It Works</h2>
              <div className="space-y-5 text-zinc-300">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      1
                    </span>
                    Describe Your Vision
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Simply describe your product or service in natural language and select a visual style. No technical
                    knowledge required—just tell us what you want to showcase.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      2
                    </span>
                    AI Creates Your Storyboard
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Claude Sonnet 4.5 analyzes your description and generates a professional 3-scene narrative with
                    precise timing (8 seconds total), camera movements, audio strategy, and scene descriptions optimized
                    for maximum impact.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      3
                    </span>
                    Generate Consistent Keyframes
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Nano Banana creates 3 high-quality reference images with perfect brand consistency. Each keyframe
                    maintains exact product details, colors, and style across all scenes—you can edit prompts or upload
                    your own images for full control.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      4
                    </span>
                    Bring It to Life with Video
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Google's Veo 3.1 transforms your storyboard and keyframes into a polished 8-second video with
                    cinematic camera movements, synchronized sound effects, background music, and smooth scene
                    transitions—all automatically generated.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Review and customize each step before moving forward. Edit scene descriptions, regenerate individual
                  keyframes, or upload your own images to ensure your final video perfectly matches your vision.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (step === "video" && storyboard) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-3xl mx-auto rounded-[2.5rem] p-4 md:p-8 lg:p-12">
          <div className="text-center space-y-3 md:space-y-4 apple-animate-in">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Final</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">Your Video</h2>
            <p className="text-base md:text-lg text-zinc-400 font-normal px-4 md:px-0">Your 8-second advertisement</p>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setStep("storyboard")}
                className="bg-transparent border-2 border-zinc-600 text-white hover:bg-zinc-700/50 hover:border-zinc-500 rounded-full px-6 md:px-8 py-2.5 text-sm transition-all duration-200"
              >
                Back
              </Button>
            </div>
          </div>

          <div className="mt-8 md:mt-10 apple-animate-in apple-animate-delay-1">
            {isGeneratingVideo && !videoUrl ? (
              <div className="w-full space-y-6">
                <div className="w-full aspect-video bg-zinc-900/40 border border-zinc-700/50 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 to-zinc-900/30 animate-pulse" />
                  <div className="relative z-10 flex flex-col items-center space-y-6 md:space-y-8 w-full max-w-md px-6 md:px-8">
                    <div className="w-full space-y-3">
                      <p className="text-lg md:text-xl text-white text-center font-semibold">
                        Generating video with Veo 3.1...
                      </p>
                      <div className="w-full h-2 bg-zinc-700/50 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-linear rounded-full shadow-lg shadow-primary/50"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-zinc-400 text-center font-normal">{videoProgress}% complete</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full">
                <video
                  src={videoUrl}
                  controls
                  className="w-full border border-zinc-700 rounded-2xl md:rounded-3xl aspect-video bg-black shadow-2xl"
                />
              </div>
            ) : null}
          </div>
        </div>

        <footer className="mt-8 md:mt-12 py-4 md:py-6 text-center text-xs md:text-sm text-zinc-500 space-x-4 md:space-x-6 font-normal apple-animate-in apple-animate-delay-3">
          <a
            href="https://v0.app/templates/ai-ad-creator-7JdqEwKmtIG"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            open in v0
          </a>
          <span>&middot;</span>
          <button onClick={() => setShowHowItWorks(true)} className="hover:text-white transition-colors duration-200">
            how it works
          </button>
          <span>&middot;</span>
          <a
            href="https://x.com/estebansuarez"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            feedback? send me a dm!
          </a>
        </footer>

        <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <DialogContent
            className="max-w-2xl border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-8"
            showCloseButton={false}
          >
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">How It Works</h2>
              <div className="space-y-5 text-zinc-300">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      1
                    </span>
                    Describe Your Product
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Tell us about your product or service and choose a visual style. Our AI understands your brand and
                    creative direction.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      2
                    </span>
                    AI Generates Storyboard
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Claude Sonnet 4.5 creates a professional 3-scene narrative structure with precise timing, camera
                    movements, and audio strategy for your 8-second ad.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      3
                    </span>
                    Create Reference Images
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Nano Banana (Google's Gemini 2.5 Flash) generates 3 high-quality keyframe images with consistent
                    brand identity, maintaining exact product details across all scenes.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold">
                      4
                    </span>
                    Generate Final Video
                  </h3>
                  <p className="text-sm leading-relaxed pl-9">
                    Google's Veo 3.1 brings everything to life, generating your complete 8-second video with
                    synchronized sound effects, music, and smooth transitions based on your storyboard and reference
                    images.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The entire process takes about 3-4 minutes. You can review and edit each step before moving forward,
                  ensuring your final video matches your vision perfectly.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return null
}
