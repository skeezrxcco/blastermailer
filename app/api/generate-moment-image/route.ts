import { NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(req: Request) {
  try {
    const { description, seedImageUrl, referenceImageUrl, productDescription, style, productIdentity, seed } =
      await req.json()

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    let prompt: string

    const styleInstructions = {
      minimal: `NYC studio aesthetic: Clean, sophisticated minimalism. Generous negative space. Refined sans-serif typography (Helvetica, Futura, GT America style). Muted, sophisticated color palette. Geometric precision. NO decorative elements. NO serif fonts. NO generic stock imagery. NO product UI simulations.`,
      cinematic: `NYC studio aesthetic: Dramatic, editorial lighting. Film-like quality with rich, intentional colors. Modern sans-serif typography only. Depth and atmosphere. Professional art direction. NO generic movie looks. NO cheesy effects. NO fake product screens.`,
      lifestyle: `NYC studio aesthetic: Natural, authentic moments with sophisticated composition. Warm, intentional lighting. Modern typography. Relatable but elevated. NO stock photo clichés. NO forced smiles. NO simulated interfaces.`,
      luxury: `NYC studio aesthetic: Elegant, refined sophistication. Premium materials and textures. Soft, directional lighting. Modern serif or refined sans-serif typography. Understated elegance. NO gaudy gold. NO generic luxury tropes. NO fake product mockups.`,
      energetic: `NYC studio aesthetic: Bold, intentional color choices. Dynamic but controlled composition. Modern sans-serif typography. High contrast with purpose. Vibrant but sophisticated. NO chaotic layouts. NO neon clichés. NO cybernetic graphics.`,
      documentary: `NYC studio aesthetic: Authentic, real-world moments with artistic eye. Natural lighting with intention. Modern typography. Unpolished but composed. NO fake candid shots. NO forced authenticity. NO staged product shots.`,
      "ny-studio": `NY STUDIO AESTHETIC (inspired by top NYC design studios like Pentagram, Collins, Wieden+Kennedy):
- Cinematographic but natural (not artificial or overly produced)
- DIVERSE APPROACHES: Can be retro/vintage film look, modern clean, black & white, warm tones, cool tones
- VINTAGE OBJECTS: Include rotary phones in pastel colors, vintage cameras, retro radios, old typewriters, vinyl records, retro clocks
- Soft, natural color palette OR sophisticated monochrome OR vintage film aesthetic
- Clean, sophisticated compositions with intentional framing
- Human and authentic - real people in real moments, genuine expressions
- Modern sans-serif typography ONLY when text is present (Helvetica, Futura, GT America, Neue Haas Grotesk style)
- Minimalist but impactful - every element has purpose
- Natural or soft lighting - window light, golden hour, studio softboxes
- Visual storytelling focus - narrative over decoration
- Cool, fresh, tech-forward but approachable with nostalgic charm
- VARIETY: Mix different sub-styles within NY aesthetic (some retro, some modern, some monochrome)
- NO generic stock imagery, NO cybernetic graphics, NO floating UI elements
- Think: Apple keynote meets indie film meets design portfolio meets vintage charm`,
      brutalist: `BRUTALIST AESTHETIC (inspired by Soviet architecture, Le Corbusier, Tadao Ando):
- Raw concrete textures, unfinished industrial materials
- Bold geometric shapes, strong angular compositions, monolithic structures
- Harsh shadows, dramatic contrast, stark lighting
- Monochromatic palette: concrete grays, raw blacks, minimal color
- Heavy, imposing presence with minimalist approach
- Wide shots emphasizing scale and architectural geometry
- NO decorative elements, NO soft edges, NO warm colors
- Think: Soviet brutalism meets modern minimalism meets industrial design`,
      "retro-wave": `RETRO WAVE AESTHETIC (inspired by 1980s, Miami Vice, Blade Runner, Drive):
- Vibrant neon colors: hot pink, electric purple, cyan blue
- Vintage 80s technology: cassette tapes, VHS players, arcade machines, boomboxes, old computers
- Sunset gradients, chrome reflections, geometric grid patterns
- Synthwave, outrun, vaporwave visual style
- Saturated neons with magenta/cyan split toning
- Low angle shots, neon reflections, retro-futuristic atmosphere
- NO modern tech, NO realistic lighting, NO muted colors
- Think: 1980s nostalgia meets cyberpunk meets synthwave album covers`,
      organic: `ORGANIC AESTHETIC (inspired by Kinfolk, Cereal magazine, Japanese wabi-sabi):
- Natural materials: wood, stone, plants, water, earth, natural fibers
- Soft diffused natural lighting, golden hour warmth
- Textures: bark, leaves, moss, linen, ceramic, terracotta
- Earthy color palette: forest greens, warm browns, natural neutrals
- Flowing, gentle compositions mimicking nature
- Close-ups of natural textures, wide environmental shots
- NO artificial materials, NO harsh lighting, NO synthetic colors
- Think: Natural living meets Japanese aesthetics meets Scandinavian nature`,
      "tech-noir": `TECH NOIR AESTHETIC (inspired by Blade Runner, Ghost in the Shell, Akira):
- Cyberpunk elegance, dystopian sophistication
- Neon signs in rain-soaked streets, moody atmospheric lighting
- High contrast with colored accent lights (blue, pink, green neons)
- Vintage tech mixed with futuristic: old CRT monitors, retro keyboards, analog displays
- Smoky, hazy atmosphere, urban decay with style
- Desaturated base with neon color pops
- Low angles, reflections in puddles, atmospheric depth
- NO bright cheerful colors, NO clean environments, NO modern UI
- Think: Blade Runner meets cyberpunk meets film noir meets neon Tokyo`,
      scandinavian: `SCANDINAVIAN AESTHETIC (inspired by Danish design, Swedish interiors, Nordic lifestyle):
- Nordic minimalism, hygge comfort, functional beauty
- Soft natural light through large windows, white walls, airy spaces
- Light wood textures: birch, pine, oak in natural tones
- Cozy textiles: wool blankets, linen, natural fabrics
- Muted color palette: whites, soft grays, gentle pastels, natural wood
- Bright, airy, slightly cool but inviting atmosphere
- Wide shots showing space and light, detail shots of textures
- NO dark colors, NO clutter, NO ornate decoration
- Think: Danish hygge meets Swedish minimalism meets Nordic nature`,
      "fast-cut": `Fast-Cut aesthetic: Dynamic, energetic, social media style. Quick cuts, punchy colors, high contrast. Modern sans-serif typography. Vibrant but intentional. NO chaotic layouts. NO generic TikTok effects.`,
      retro: `Retro aesthetic: Vintage, nostalgic, 80s/90s style. Film grain, warm tones, classic compositions. Retro typography. Authentic vintage feel. NO modern elements. NO digital effects.`,
    }

    const styleGuide = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.cinematic

    if (seedImageUrl || referenceImageUrl) {
      const imageToUse = seedImageUrl || referenceImageUrl
      const imageType = seedImageUrl
        ? "seed image (for scene consistency)"
        : "reference image (for brand/product consistency)"

      prompt = `Generate an image of: ${description}

🎯 CRITICAL PRODUCT CONSISTENCY REQUIREMENTS - ABSOLUTE PRIORITY:

EXACT PRODUCT MATCH: The product MUST be IDENTICAL to the ${imageType} in EVERY detail:
✅ SAME brand name and logo (exact design, colors, typography, placement)
✅ SAME product colors (if red in reference, MUST be red; if blue, MUST be blue)
✅ SAME packaging design (label layout, graphics, patterns, text placement)
✅ SAME product variant (glass bottle stays glass, aluminum can stays aluminum)
✅ SAME distinctive features (cap style, bottle shape, label size, logo position)

${productIdentity ? `\n🎯 PRODUCT IDENTITY TO MAINTAIN:\n${productIdentity}\n\nThis EXACT product description MUST be visible in the generated image.\n` : ""}

WHAT CAN CHANGE (and ONLY these):
✅ Camera angle and perspective
✅ Composition and framing
✅ Background and environment
✅ Lighting direction and quality
✅ Context and scene setting

WHAT MUST NEVER CHANGE:
❌ Product design, colors, or branding
❌ Logo appearance or placement on product
❌ Packaging style or label design
❌ Product variant or materials

VISUAL STYLE CONSISTENCY:
- Match the reference image's lighting quality and direction
- Match the color palette and mood
- Match the composition style and framing approach
- Match the texture and detail level

ABSOLUTELY NO TEXT: NO words, letters, typography, captions, subtitles, product names beyond what's naturally on the product packaging, or any written text visible in the image.

Product: ${productDescription}
${seed ? `Seed: ${seed}` : ""}

Generate immediately with EXACT product design consistency - only the angle and context should change, NOT the product itself.`
    } else {
      prompt = `Generate a ${style} style advertising image of: ${description}

${productIdentity ? `\n🎯 CRITICAL PRODUCT IDENTITY TO MAINTAIN EXACTLY:\n${productIdentity}\n\nThis EXACT product description with specific brand, colors, and features MUST be clearly visible and accurate in the image.\n` : ""}

STYLE REQUIREMENTS: ${styleGuide}

🎯 BRAND CONSISTENCY REQUIREMENTS:
✅ If a specific brand is mentioned, show the EXACT brand logo and design
✅ Maintain PRECISE product colors (red Coca-Cola, blue Pepsi, etc.)
✅ Show ACCURATE product packaging and distinctive features
✅ Keep CONSISTENT product variant throughout (same bottle type, can design, shoe model)

CRITICAL: AVOID GENERIC/INCORRECT IMAGERY
❌ DO NOT simulate product interfaces, dashboards, or app UIs
❌ DO NOT create fake screenshots or mockups of specific products
❌ DO NOT show detailed product screens that could be incorrect
❌ DO NOT use cybernetic graphics, floating holograms, OR generic tech overlays
❌ DO NOT create fake brand interfaces OR dashboards
❌ DO NOT show incorrect or generic versions of branded products

❌ ABSOLUTELY NO TEXT: NO words, letters, typography, captions, subtitles, product names beyond what's on the actual product, logos beyond the product itself, or any written text visible in the image
❌ NO on-screen text, NO brand names floating in space, NO product labels separate from the product

✅ INSTEAD, SHOW:
- Real branded products with accurate logos and designs
- Authentic product packaging and colors
- Real people interacting with the actual product
- Environmental storytelling with the correct product
- Brand elements as they naturally appear on the product
- Results and outcomes with the real product visible

TYPOGRAPHY RULES:
- NO TEXT should appear in the generated image beyond what's naturally on the product
- Focus on visual storytelling without relying on added text

AESTHETIC DIRECTION:
- Think Pentagram, Collins, OR top NYC design studio
- Fresh, cool, sophisticated aesthetic
- Avoid generic stock imagery
- Real products with accurate branding
- Intentional composition and art direction
- Focus on authentic product representation

Product: ${productDescription}
${seed ? `Seed: ${seed}` : ""}

Generate immediately in this exact style with professional quality, accurate branding, and NO ADDED TEXT.`
    }

    const input: any = {
      prompt,
      num_images: 1,
      image_size: "landscape_16_9",
      num_inference_steps: 4,
    }

    // Add seed if provided
    if (seed) {
      input.seed = seed
    }

    const imageUrlToUse = seedImageUrl || referenceImageUrl
    if (imageUrlToUse) {
      input.image_url = imageUrlToUse
      input.strength = referenceImageUrl ? 0.35 : 0.5
    }

    const result = await fal.subscribe("fal-ai/nano-banana", {
      input,
    })

    const imageUrl = result.images?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ error: "No image was generated" }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl,
      fullPrompt: prompt,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
