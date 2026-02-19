"use client"

import { SmokeRing } from "@paper-design/shaders-react"

export function SmokeRingBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <SmokeRing
        speed={0.5}
        scale={1.36}
        thickness={0.76}
        radius={0.25}
        innerShape={0.88}
        noiseScale={2.18}
        noiseIterations={8}
        offsetX={0}
        offsetY={0}
        colors={["#5796B3"]}
        colorBack="#00000000"
        style={{
          backgroundColor: "#000000",
          height: "100vh",
          width: "100vw",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </div>
  )
}
