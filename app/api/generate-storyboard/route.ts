import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { prompt, style, referenceImageUrl } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const stylePersonality = {
      luxury: `LUXURY STYLE PERSONALITY:
- Premium, elegant, sophisticated, high-end aesthetic
- Perfect lighting, immaculate composition, flawless execution
- Smooth, controlled camera movements (dolly, crane, gimbal)
- High-end materials: leather, metal, glass, marble, silk
- Minimalist but rich environments, attention to detail
- Classical, orchestral, or modern elegant music
- Color grading: rich blacks, pristine whites, jewel tones, gold accents
- Detail shots, slow reveals, symmetrical compositions
- Aspirational, exclusive, timeless quality
- AUDIO: Typically uses voiceover with elegant music, sophisticated narration`,

      minimal: `MINIMAL STYLE PERSONALITY:
- Clean, simple, zen-like, less is more philosophy
- Soft, even lighting, no harsh shadows, natural light preferred
- Slow, deliberate camera movements or static shots
- Negative space, breathing room, simplicity, focus on essentials
- Monochromatic or limited color palette (whites, grays, pastels)
- Ambient, minimal electronic, or no music (silence is powerful)
- Color grading: muted, desaturated, monochrome, soft tones
- Wide shots with space, centered compositions, geometric precision
- Modern, tech-forward, product demo aesthetic
- AUDIO: Often music-only with ambient sounds, minimal voiceover`,

      retro: `1960s VINTAGE RETRO STYLE PERSONALITY:
MANDATORY VISUAL CONSISTENCY ACROSS ALL 3 SCENES:
- SAME color palette in every scene: Warm oranges, mustard yellows, olive greens, burnt sienna, turquoise, warm browns
- SAME film aesthetic: Kodachrome film look, natural grain, slight color shift, warm glow
- SAME lighting style: Warm, natural light with soft shadows, golden hour quality
- SAME era-specific elements: Mid-century modern furniture, vintage props, period-appropriate clothing
- AUDIO: Classic voiceover style with upbeat retro music (surf rock, jazz, Motown)`,

      cinematic: `CINEMATIC STYLE PERSONALITY:
- Epic, dramatic, storytelling, film-like quality
- High contrast lighting, dramatic shadows, golden hour, blue hour
- Anamorphic lens flares, shallow depth of field, bokeh
- Slow-motion moments, dramatic reveals, emotional beats
- Orchestral, epic, or intense electronic score
- Color grading: teal/orange, desaturated with pops of color
- Wide establishing shots, intimate close-ups, tracking shots
- Theatrical, larger-than-life, emotional narrative
- AUDIO: Typically both voiceover and music for dramatic storytelling`,

      "fast-cut": `FAST-CUT STYLE PERSONALITY - EXTREME ENERGY:
- RAPID FIRE editing: Multiple angles per second, constant movement, never static
- DESCRIBE 3-5 DIFFERENT SHOTS/ANGLES in each scene description (wide → close-up → detail → POV → reaction)
- Hyper-dynamic camera: Whip pans, speed ramps, crash zooms, 360° spins, dutch angles
- Explosive energy: Every frame bursting with movement, color, and action
- Handheld chaos: Shaky cam, POV shots, first-person perspective, extreme angles
- Vibrant overload: Neon colors, high saturation, strobing effects, color shifts
- TikTok/Reels aesthetic: Vertical framing friendly, attention-grabbing, scroll-stopping
- Multiple subjects: Show different people, angles, reactions in rapid succession
- Upbeat, electronic, hip-hop, or trending music with heavy bass drops
- Color grading: Punchy, vibrant, neon accents, high contrast, color pop effects
- AUDIO: Music-driven with HEAVY SFX (whooshes, impacts, transitions), minimal voiceover
- Think: Music video energy, sports highlight reel, action montage, viral content
- MANDATORY: Each scene must feel like 5-10 rapid cuts compressed into one description`,

      lifestyle: `LIFESTYLE STYLE PERSONALITY:
- Authentic, aspirational, relatable, product in use
- Natural, warm lighting (golden hour preferred), soft shadows
- Handheld camera feel, organic movement, human perspective
- Real people, real environments, everyday moments
- Casual, comfortable, achievable but aspirational
- Acoustic, indie, or soft electronic music
- Color grading: warm, inviting, slightly desaturated, natural
- Medium shots, environmental context, human connection
- AUDIO: Often voiceover with music, conversational and relatable tone`,
    }

    const result = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      prompt: `Create a storyboard for an 8-second video ad following Google Veo 3.1 best practices.

Product: ${prompt}
Visual Style: ${style || "cinematic"}
${referenceImageUrl ? `\nReference Image URL: ${referenceImageUrl}\n\nIMPORTANT: A reference image has been provided. Analyze this image to understand:\n- Brand colors, logo design, and visual identity\n- Product appearance, shape, and distinctive features\n- Style and aesthetic that should be maintained\n- Any text, typography, or design elements\n\nUse this reference to ensure EXACT visual consistency across all 3 scenes. The product in the generated images MUST match the reference image precisely.` : ""}

${stylePersonality[style as keyof typeof stylePersonality] || stylePersonality.cinematic}

AUDIO STRATEGY - YOU DECIDE:
Based on the product and style, choose the BEST audio approach:
- "voiceover" - Dialogue-driven with narration in quotes
- "music" - Music-driven with explicit SFX and ambient descriptions  
- "both" - Voiceover AND music with dialogue in quotes and explicit SFX

Consider:
- Luxury/Cinematic → Often "both" (voiceover + music)
- Minimal/Fast-Cut → Often "music" only
- Lifestyle/Retro → Often "both" (voiceover + music)

CRITICAL PRODUCT CONSISTENCY REQUIREMENTS - MANDATORY:
🎯 PRODUCT IDENTITY: First, identify the EXACT product characteristics that MUST remain consistent:
   - Brand name and logo design (exact colors, typography, placement)
   - Product colors (primary, secondary, accent colors)
   - Product shape and form (bottle shape, can design, shoe model, etc.)
   - Packaging design (label layout, graphics, patterns)
   - Distinctive features (cap style, texture, materials)

🎯 CONSISTENCY ACROSS ALL 3 SCENES:
   ✅ Use IDENTICAL product description in all 3 scene descriptions
   ✅ Specify EXACT brand name in every scene: "Pepsi bottle with red, white, and blue logo"
   ✅ Describe SAME product variant: "silver aluminum can" or "glass bottle" - pick ONE and use it in ALL scenes
   ✅ Mention SAME distinctive features: "Nike Air Jordan 1 with red swoosh" in EVERY scene
   ✅ Keep SAME product colors: "red Coca-Cola can" or "blue Pepsi bottle" - EXACT same color in all scenes

🎯 PRODUCT DESCRIPTION TEMPLATE (use this structure in EVERY scene):
   "[BRAND NAME] [PRODUCT TYPE] with [DISTINCTIVE FEATURES]"
   Examples:
   - "Pepsi glass bottle with classic red, white, and blue circular logo"
   - "Nike Air Jordan 1 sneaker with iconic red swoosh and white leather"
   - "iPhone 15 Pro in titanium blue with triple camera system"

${
  style === "retro"
    ? `
1960s VINTAGE CONSISTENCY - MANDATORY:
✅ ALL 3 scenes MUST use the SAME warm color palette: Mustard yellow, burnt orange, olive green, turquoise, warm browns
✅ ALL 3 scenes MUST have Kodachrome film grain and warm glow
✅ ALL 3 scenes MUST feature period-appropriate 1960s elements
✅ ALL 3 scenes MUST feel like they're from the SAME vintage 1960s commercial
✅ PRODUCT must maintain EXACT same design across all scenes despite vintage aesthetic
`
    : ""
}

GOOGLE VEO 3.1 FIVE-PART FORMULA (MANDATORY):
Each scene MUST include ALL five elements:
1. [CINEMATOGRAPHY] - Camera movement, angle, lens type, focus
2. [SUBJECT] - What/who is in frame, their appearance, positioning - INCLUDE EXACT PRODUCT DESCRIPTION
3. [ACTION] - What's happening, movement, gestures, interactions
4. [CONTEXT] - Setting, environment, time of day, atmosphere
5. [STYLE & AMBIANCE] - Mood, lighting quality, color palette, aesthetic

TIMING REQUIREMENTS (STRICT):
- [00:00-00:03] Scene 1: Opening hook - grab attention IMMEDIATELY
- [00:03-00:06] Scene 2: Product showcase - show key benefit QUICKLY  
- [00:06-00:08] Scene 3: Closing message - MUST have clear, definitive ending
  * Final scene MUST communicate completion and closure
  * Include fade to black, logo hold, or conclusive action
  * Should feel like a proper ending, not an abrupt cut
  * Last moment should leave lasting impression

AUDIO DIRECTION (GOOGLE VEO FORMAT):
- Dialogue: Use quotes "Hello world" for spoken words
- SFX: Be explicit "keyboard clicking", "door opening", "glass breaking"
- Ambient: Describe background "city traffic", "ocean waves", "office chatter"
- Music: Specify genre and mood "upbeat electronic music", "soft piano melody"

CRITICAL VISUAL RULES:
❌ NEVER simulate product interfaces, dashboards, or UIs
❌ NEVER show fake screenshots or mockups
❌ NEVER use generic tech visuals or floating holograms
✅ FOCUS ON: Real people, authentic reactions, abstract concepts, human moments, results/benefits

PHYSICAL & CULTURAL COHERENCE - MANDATORY:
🎯 PHYSICAL LOGIC:
   ✅ Bottles/containers must be OPEN when pouring liquid (cap removed, lid off)
   ✅ Objects must be in correct physical states for their actions
   ✅ Gravity and physics must be respected
   ✅ One action per person at a time (no simultaneous impossible actions)
   
🎯 CULTURAL ACCURACY:
   ✅ Mate (Argentine tea): ONE person drinks, then passes to next person - NEVER two people drinking simultaneously
   ✅ Respect cultural practices and traditions accurately
   ✅ Show proper use of cultural items and rituals
   ✅ Research cultural context if unfamiliar
   
🎯 LOGICAL ACTIONS:
   ✅ Actions must follow logical sequence (open → pour → drink, not pour → open)
   ✅ Objects must be handled correctly (phones held right-side up, books opened properly)
   ✅ Human interactions must be natural and realistic
   ✅ Cause and effect must be clear and logical

Examples of INCORRECT actions to AVOID:
❌ Closed bottle pouring liquid
❌ Two people drinking from same mate simultaneously
❌ Person typing on closed laptop
❌ Drinking from empty glass
❌ Pouring into already-full container

TEXT IN KEYFRAMES - CRITICAL RULES:
❌ NO TEXT in scenes 1 and 2 (first 6 seconds) - ABSOLUTELY NO WORDS, LETTERS, TYPOGRAPHY
❌ NO product names, logos, or brand text in early scenes
❌ NO captions, subtitles, or on-screen text in opening scenes
✅ Text ONLY allowed in scene 3 (final 2 seconds) IF the script specifically requires it

For each moment, provide:
- SHORT SUMMARY (1 sentence, max 10 words)
- DETAILED DESCRIPTION using the five-part formula with EXACT PRODUCT DESCRIPTION repeated (NO TEXT in scenes 1-2)
- CAMERA MOVEMENT (specific: dolly in, crane up, tracking shot, etc.)
- AUDIO (with quotes for dialogue, explicit SFX, ambient descriptions)
- PRODUCT_IDENTITY (EXACT product description to maintain consistency - same in all 3 scenes)

Return ONLY valid JSON:
{
  "productIdentity": "EXACT product description with brand, colors, distinctive features",
  "audioStrategy": "Voiceover and music with dialogue and SFX" (or "Music with SFX" or "Voiceover only"),
  "musicStyle": "Specific music genre and mood matching ${style}" or null,
  "voiceoverScript": "SHORT script with key phrases in quotes" or null,
  "moments": [
    {
      "timing": "[00:00-00:03]",
      "title": "Opening Hook",
      "summary": "One sentence, max 10 words",
      "description": "[CINEMATOGRAPHY] Dolly in, 35mm lens, shallow depth of field. [SUBJECT] Person holding [EXACT PRODUCT IDENTITY], focused expression. [ACTION] Reaching for product on counter. [CONTEXT] Modern kitchen, morning light through windows. [STYLE & AMBIANCE] ${style} aesthetic with natural lighting. NO TEXT, NO WORDS, NO TYPOGRAPHY visible.",
      "cameraMovement": "Dolly in from medium to close-up",
      "audio": "Dialogue: \\"Let's try this\\" + SFX: bottle opening + Ambient: soft kitchen sounds + Music: upbeat",
      "productIdentity": "EXACT product description - MUST be identical in all 3 scenes"
    },
    {
      "timing": "[00:03-00:06]",
      "title": "Product Showcase",
      "summary": "One sentence, max 10 words",
      "description": "[CINEMATOGRAPHY] Tracking shot, wide angle. [SUBJECT] Hands on keyboard, screen glow on face. [ACTION] Code appearing, satisfied nod. [CONTEXT] Same office, focused atmosphere. [STYLE & AMBIANCE] ${style} with screen glow accent lighting. NO TEXT, NO WORDS, NO TYPOGRAPHY visible.",
      "cameraMovement": "Smooth tracking shot left to right",
      "audio": "SFX: success chime + Ambient: quiet concentration + Music: building intensity",
      "productIdentity": "EXACT product description - MUST be identical in all 3 scenes"
    },
    {
      "timing": "[00:06-00:08]",
      "title": "Closing Message",
      "summary": "One sentence, max 10 words",
      "description": "[CINEMATOGRAPHY] Static shot with slow fade to black, centered composition. [SUBJECT] Product logo/brand element with final product placement. [ACTION] Subtle final reveal or hold, then fade to black starting at 7.5 seconds for smooth ending. [CONTEXT] Clean background, professional setting with sense of completion. [STYLE & AMBIANCE] ${style} with polished finish and definitive ending. Text overlay with product name if needed. MUST feel like a complete ending, not abrupt cutoff.",
      "cameraMovement": "Static centered shot with subtle zoom, fade to black at end",
      "audio": "Dialogue: \\"${prompt}\\" + Music: triumphant finale with clear ending",
      "productIdentity": "EXACT product description - MUST be identical in all 3 scenes"
    }
  ]
}`,
    })

    let storyboard
    try {
      storyboard = JSON.parse(result.text)
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response")
      }
      storyboard = JSON.parse(jsonMatch[0])
    }

    return NextResponse.json(storyboard)
  } catch (error) {
    console.error("Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        error: "Failed to generate storyboard",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
