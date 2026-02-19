import { NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

export const maxDuration = 300 // 5 minutes - REQUIRES VERCEL PRO PLAN OR HIGHER
export const dynamic = "force-dynamic" // Ensure this route is always dynamic

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { storyboard, images, productDescription, style } = body

    if (!storyboard || !images || images.length === 0) {
      return NextResponse.json({ error: "Storyboard and images are required" }, { status: 400 })
    }

    if (images.length !== 3) {
      return NextResponse.json({ error: `Expected 3 images but received ${images.length}` }, { status: 400 })
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        {
          error: "FAL_KEY not configured",
          details: "The FAL_KEY environment variable is missing. Please add it in your Vercel project settings.",
        },
        { status: 500 },
      )
    }

    const videoPrompt = `Create an 8-second ${style} commercial for ${productDescription}.

SCENES (8 seconds total):
${storyboard.moments
  .map(
    (m: any, idx: number) => `
${m.timing}: ${m.title}
${m.description}
Camera: ${m.cameraMovement}`,
  )
  .join("\n")}

Audio: ${storyboard.audioStrategy}
Music: ${storyboard.musicStyle}

CRITICAL REQUIREMENTS:
- Style: ${style}, cinematic, professional quality
- Duration: EXACTLY 8 seconds total
- ENDING: The final scene (7-8 seconds) MUST have a clear, definitive ending:
  * Fade to black starting at 7.5 seconds
  * OR final logo/product reveal with hold
  * OR clear visual conclusion (person walks away, door closes, product placed down)
  * The video must feel COMPLETE, not abruptly cut off
  * Last frame should communicate "this is the end"

PHYSICAL & CULTURAL COHERENCE (CRITICAL):
✅ Physical Logic:
   - Bottles/containers MUST be visibly OPEN (cap removed, lid off) when liquid is pouring
   - Show the opening action BEFORE pouring (twist cap, pull tab, remove lid)
   - Objects must be in correct physical states for their actions
   - Respect gravity and physics at all times
   - One logical action per person at a time

✅ Cultural Accuracy:
   - Mate (Argentine tea): Show ONE person drinking, then PASSING to another - NEVER two people drinking from same mate simultaneously
   - Respect cultural practices: proper handling of cultural items, accurate rituals
   - Research and honor cultural context for any cultural products or practices
   - Show authentic, respectful use of cultural items

✅ Logical Action Sequences:
   - Actions must follow natural order: open → pour → drink (NOT pour → open)
   - Cause and effect must be clear and visible
   - Human interactions must be natural and realistic
   - Objects handled correctly (phones right-side up, proper grip, natural movements)

❌ NEVER SHOW:
   - Closed bottles pouring liquid
   - Multiple people using same single-use item simultaneously (mate, straw, etc.)
   - Impossible physics or illogical actions
   - Cultural practices done incorrectly
   - Actions out of sequence (effect before cause)
   - Abrupt endings without visual closure

- Smooth transitions between scenes with natural motion
- Clear, satisfying ending with visual closure (fade out, logo hold, or conclusive action)`

    const negativePrompt = `blurry, low quality, distorted, warped, deformed, bad anatomy, watermark, signature, text artifacts, longer than 8 seconds, extended duration, slow pacing, static shots, amateur quality, physical inconsistencies, closed bottles pouring liquid, impossible physics, illogical actions, discontinuity errors, cultural inaccuracies, multiple people using same single-use item simultaneously, actions out of sequence, cause without effect, effect without cause, abrupt ending, incomplete ending, cut-off ending`

    const falPayload = {
      image_urls: images,
      prompt: videoPrompt,
      negative_prompt: negativePrompt,
      duration: "8s",
      resolution: "720p",
      aspect_ratio: "16:9",
      generate_audio: true,
    }

    const { request_id } = await fal.queue.submit("fal-ai/veo3.1/reference-to-video", {
      input: falPayload,
    })

    // Poll for completion
    let status: any
    let attempts = 0
    const maxAttempts = 180 // 3 minutes max (180 seconds)

    while (attempts < maxAttempts) {
      status = await fal.queue.status("fal-ai/veo3.1/reference-to-video", {
        requestId: request_id,
        logs: true,
      })

      if (status.status === "COMPLETED") {
        break
      }

      if (status.status === "FAILED") {
        throw new Error(`Video generation failed: ${JSON.stringify(status)}`)
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error("Video generation timed out after 3 minutes")
    }

    // Get the result
    const result: any = await fal.queue.result("fal-ai/veo3.1/reference-to-video", {
      requestId: request_id,
    })

    let videoUrl: string | undefined

    try {
      if (result && typeof result === "object") {
        // Try all possible response structures
        videoUrl =
          result.video?.url ||
          result.data?.video?.url ||
          result.data?.url ||
          result.url ||
          result.output?.url ||
          result.output?.video?.url ||
          (typeof result === "string" ? result : undefined)
      }

      if (!videoUrl) {
        throw new Error("Video URL not found in Veo 3.1 response")
      }

      return NextResponse.json({
        videoUrl,
        prompt: videoPrompt,
        metadata: {
          duration: "8s",
          resolution: "720p",
          aspectRatio: "16:9",
          style,
          scenesCount: storyboard.moments.length,
        },
      })
    } catch (urlError) {
      throw new Error(`Failed to extract video URL: ${urlError instanceof Error ? urlError.message : "Unknown error"}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        error: "Failed to generate video",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
