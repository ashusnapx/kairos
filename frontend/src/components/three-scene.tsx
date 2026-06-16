"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Icosahedron, TorusKnot, Environment } from "@react-three/drei"
import * as THREE from "three"

function FloatingShape({
  position,
  color,
  type = "icosahedron",
  scale = 1,
  speed = 1,
  offset = 0,
}: {
  position: [number, number, number]
  color: string
  type?: "icosahedron" | "torus"
  scale?: number
  speed?: number
  offset?: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const initialY = position[1]

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.x += 0.003 * speed
    ref.current.rotation.y += 0.007 * speed
    ref.current.position.y = initialY + Math.sin(state.clock.elapsedTime * speed * 0.4 + offset) * 0.4
    ref.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * speed * 0.3 + offset + 1) * 0.15
  })

  return (
    <mesh ref={ref} position={position} scale={scale}>
      {type === "torus" ? (
        <TorusKnot args={[0.5, 0.18, 64, 8]} />
      ) : (
        <Icosahedron args={[0.6, 1]} />
      )}
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.15}
        transparent
        opacity={0.55}
        wireframe
      />
    </mesh>
  )
}

function Scene() {
  const shapes = useMemo(
    () => [
      { position: [-2.2, 0.8, -0.5] as [number, number, number], color: "#6366f1", type: "icosahedron" as const, scale: 1.2, speed: 0.8, offset: 0 },
      { position: [2.0, -0.5, -1.2] as [number, number, number], color: "#06b6d4", type: "torus" as const, scale: 1, speed: 1.1, offset: 1.5 },
      { position: [0.0, 1.5, -2.5] as [number, number, number], color: "#10b981", type: "icosahedron" as const, scale: 0.9, speed: 0.6, offset: 3 },
      { position: [-1.0, -1.2, -2.0] as [number, number, number], color: "#6366f1", type: "torus" as const, scale: 0.8, speed: 0.9, offset: 2 },
      { position: [2.5, 1.2, -3.5] as [number, number, number], color: "#06b6d4", type: "icosahedron" as const, scale: 0.7, speed: 0.7, offset: 4 },
      { position: [0.8, -0.8, -3.0] as [number, number, number], color: "#10b981", type: "torus" as const, scale: 0.6, speed: 1.2, offset: 0.5 },
    ],
    []
  )

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 8, 8]} intensity={1.2} color="#6366f1" />
      <pointLight position={[-6, -4, -6]} intensity={0.6} color="#06b6d4" />
      <pointLight position={[0, 6, -8]} intensity={0.4} color="#10b981" />
      {shapes.map((s, i) => (
        <FloatingShape key={i} {...s} />
      ))}
      <Environment preset="night" />
    </>
  )
}

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
