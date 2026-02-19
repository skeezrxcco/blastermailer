"use client"

import { MeshGradient as MeshGradient1 } from "@paper-design/shaders-react"

export default function MeshGradient() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <MeshGradient1
        speed={1.17}
        colors={["#071540", "#030D1E", "#000000"]}
        distortion={0.12}
        swirl={0.49}
        grainMixer={0}
        grainOverlay={0}
        frame={127089.28599992377}
        style={{ height: "1128px", width: "1728px" }}
      />
    </div>
  )
}
