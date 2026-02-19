import { generateText } from "ai"
import { NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { put } from "@vercel/blob"

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(req: Request) {
  try {
    console.log("[v0] API: Generating image with seed:", req.headers.get("x-use-seed"))
    console.log("[v0] API: Product identity:", req.headers.get("x-product-identity"))
    console.log("[v0] API: Seed value:", req.headers.get("x-seed-value"))

    const { prompt, style, useSeed, seedImage, productIdentity } = await req.json()

    console.log("[v0] API: Style:", style)
    console.log("[v0] API: Prompt:", prompt?.substring(0, 200))

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    let result
    if (useSeed && seedImage) {
      console.log("[v0] API: Using messages format with seed image")
      result = await generateText({
        model: "google/gemini-2.5-flash-image-preview",
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Use this image as a visual reference for brand consistency (colors, style, lighting, composition). Generate a new image that maintains the same visual identity:\n\n${prompt}`,
              },
              {
                type: "image",
                image: seedImage,
              },
            ],
          },
        ],
      })
    } else {
      console.log("[v0] API: Using prompt format without seed")
      result = await generateText({
        model: "google/gemini-2.5-flash-image-preview",
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        prompt,
      })
    }

    console.log("[v0] API: generateText completed")
    console.log("[v0] API: result.text:", result.text)
    console.log("[v0] API: result.files exists:", !!result.files)
    console.log("[v0] API: result.files length:", result.files?.length)

    // Extract the first image from the result
    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/"))

    console.log("[v0] API: Found", imageFiles?.length || 0, "images")

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json({ error: "No image was generated" }, { status: 500 })
    }

    const imageFile = imageFiles[0]

    console.log("[v0] API: Preparing to upload image to Vercel Blob")
    console.log("[v0] API: Image size:", imageFile.uint8Array.length, "bytes")
    console.log("[v0] API: Image type:", imageFile.mediaType)

    const imageBlob = new Blob([imageFile.uint8Array], { type: imageFile.mediaType })

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const extension = imageFile.mediaType?.split("/")[1] || "png"
    const filename = `ad-image-${timestamp}-${randomId}.${extension}`

    console.log("[v0] API: Uploading to Vercel Blob with filename:", filename)

    try {
      // Upload to Vercel Blob
      const { url } = await put(filename, imageBlob, {
        access: "public",
      })

      console.log("[v0] API: ✅ Successfully uploaded image to Vercel Blob")
      console.log("[v0] API: Blob URL:", url)
      console.log("[v0] API: URL length:", url.length, "characters")

      return NextResponse.json({
        imageUrl: url, // Return HTTP URL from Vercel Blob
        description: result.text || "",
      })
    } catch (blobError) {
      console.error("[v0] API: ❌ Failed to upload to Vercel Blob:", blobError)
      console.error("[v0] API: Blob error details:", JSON.stringify(blobError, null, 2))
      throw new Error(`Blob upload failed: ${blobError}`)
    }
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
