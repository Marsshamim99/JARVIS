'use client'

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type AnimationClock = RefObject<number>

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uSize;
  uniform float uHeight;
  uniform float uPixelRatio;
  varying float vPhase;
  void main() {
    vPhase = aPhase;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float scale = length(modelViewMatrix[0].xyz);
    gl_PointSize = min(180.0, uSize * aSize * scale * uPixelRatio * uHeight * 0.5 * projectionMatrix[1][1] / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`

const pointFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSparkle;
  varying float vPhase;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    float halo = exp(-d * 6.0) * 0.26;
    float center = exp(-d * d * 115.0);
    float cross = (exp(-abs(p.x) * 100.0) * exp(-abs(p.y) * 13.0)
                 + exp(-abs(p.y) * 100.0) * exp(-abs(p.x) * 13.0)) * 0.22 * uSparkle;
    float pulse = 0.83 + 0.17 * sin(uTime * 1.8 + vPhase);
    float brightness = (halo + center + cross) * pulse;
    float fade = 1.0 - smoothstep(0.7, 1.0, d);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), center * 0.58) * uIntensity, brightness * fade);
  }
`

export function GlowPoints({
  positions,
  color,
  size,
  clock,
  intensity = 2.2,
  sparkle = true,
}: {
  positions: Float32Array
  color: string
  size: number
  clock: AnimationClock
  intensity?: number
  sparkle?: boolean
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    const count = positions.length / 3
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    result.setAttribute('aSize', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => 0.75 + (Math.sin(i * 72.41) * 0.5 + 0.5) * 0.5), 1))
    result.setAttribute('aPhase', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => i * 2.39996), 1))
    return result
  }, [positions])
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uSize: { value: size },
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uSparkle: { value: sparkle ? 1 : 0 },
    uHeight: { value: 766 },
    uPixelRatio: { value: 1 },
  }), [color, size, intensity, sparkle])

  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ gl, size: viewport }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.current
    material.current.uniforms.uHeight.value = viewport.height
    material.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

const glassVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const glassFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGlassColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
    vec2 edges = min(vUv, 1.0 - vUv);
    float rim = 1.0 - smoothstep(0.0, 0.023, min(edges.x, edges.y));
    float gridX = 1.0 - smoothstep(0.005, 0.018, abs(fract(vUv.x * 7.0) - 0.5));
    float gridY = 1.0 - smoothstep(0.008, 0.025, abs(fract(vUv.y * 4.0) - 0.5));
    float grid = max(gridX, gridY) * 0.15;
    float reflection = pow(max(0.0, cos(vUv.y * 5.0 + vUv.x * 2.0)), 14.0);
    vec3 base = uGlassColor * (0.35 + reflection * 0.65);
    vec3 gold = uColor * (rim * 1.8 + fresnel * 0.45 + grid);
    gl_FragColor = vec4(base + gold, clamp(uOpacity + rim * 0.65 + fresnel * 0.28 + grid, 0.0, 0.95));
  }
`

export function GlassMaterial({ color, glassColor, opacity }: { color: string; glassColor: string; opacity: number }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uGlassColor: { value: new THREE.Color(glassColor) },
    uOpacity: { value: opacity },
  }), [color, glassColor, opacity])
  return <shaderMaterial uniforms={uniforms} vertexShader={glassVertex} fragmentShader={glassFragment} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
}

export function Arc({ radius, start = 0, length = Math.PI * 2, tube = 0.003, color, opacity = 1, z = 0 }: {
  radius: number
  start?: number
  length?: number
  tube?: number
  color: THREE.ColorRepresentation
  opacity?: number
  z?: number
}) {
  return (
    <mesh rotation={[0, 0, start]} position={[0, 0, z]}>
      <torusGeometry args={[radius, tube, 8, Math.max(16, Math.ceil(length * 40)), length]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

export function illuminated(color: string, intensity = 1.6) {
  return new THREE.Color(color).multiplyScalar(intensity)
}
