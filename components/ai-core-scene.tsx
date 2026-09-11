'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { AICoreConfig } from '@/lib/ai-core-config'
import { Arc, GlassMaterial, GlowPoints, illuminated, type AnimationClock } from './ai-core-materials'

type LayerProps = { config: AICoreConfig; clock: AnimationClock }
const TAU = Math.PI * 2
const ORIGIN = new Float32Array([0, 0, 0])

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function useNetwork(radius: number, detail: number) {
  const geometry = useMemo(() => {
    const sphere = new THREE.IcosahedronGeometry(radius, detail)
    const wire = new THREE.WireframeGeometry(sphere)
    const attribute = sphere.getAttribute('position')
    const unique = new Map<string, number[]>()
    for (let i = 0; i < attribute.count; i++) {
      const x = attribute.getX(i)
      const y = attribute.getY(i)
      const z = attribute.getZ(i)
      unique.set(`${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`, [x, y, z])
    }
    sphere.dispose()
    return { wire, positions: new Float32Array(Array.from(unique.values()).flat()) }
  }, [radius, detail])
  useEffect(() => () => geometry.wire.dispose(), [geometry])
  return geometry
}

function NeuralNetwork({ config, clock }: LayerProps) {
  const group = useRef<THREE.Group>(null)
  const { wire, positions } = useNetwork(config.networkRadius, config.networkDetail)
  const gold = useMemo(() => illuminated(config.color, 1.15), [config.color])
  useFrame(() => {
    if (!group.current) return
    group.current.rotation.set(0.15 + Math.sin(clock.current * 0.12) * 0.12, clock.current * config.rotationSpeed, 0.08)
  })

  return (
    <group ref={group}>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color={gold} transparent opacity={0.42} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <GlowPoints positions={positions} color={config.color} size={config.nodeSize} clock={clock} intensity={4} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[i * 0.8 + 0.3, i * 0.65, i * 0.45]}>
          <Arc radius={config.networkRadius * 1.015} color={gold} opacity={0.35} tube={0.002} />
        </group>
      ))}
    </group>
  )
}

function Nucleus({ config, clock }: LayerProps) {
  const group = useRef<THREE.Group>(null)
  const lattice = useRef<THREE.Group>(null)
  const { wire, positions } = useNetwork(config.coreRadius, 1)
  const blue = useMemo(() => illuminated(config.coreColor, 2.2), [config.coreColor])
  useFrame(() => {
    if (group.current) group.current.scale.setScalar(1 + Math.sin(clock.current * config.pulseSpeed) * config.pulseAmount)
    if (lattice.current) lattice.current.rotation.set(clock.current * 0.12, -clock.current * 0.28, clock.current * 0.05)
  })

  return (
    <group ref={group}>
      <GlowPoints positions={ORIGIN} color={config.coreColor} size={config.coreRadius * 5.3} clock={clock} intensity={2.1} sparkle={false} />
      <mesh>
        <sphereGeometry args={[config.coreRadius * 0.97, 32, 24]} />
        <meshBasicMaterial color={config.coreColor} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={lattice}>
        <lineSegments geometry={wire}>
          <lineBasicMaterial color={blue} transparent opacity={0.85} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
        <GlowPoints positions={positions} color={config.coreColor} size={config.nodeSize * 0.8} clock={clock} intensity={3.2} />
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[i * 0.9, i * 0.6, 0]}>
            <Arc radius={config.coreRadius * (1.1 + i * 0.08)} color={blue} tube={0.003} opacity={0.65} />
          </group>
        ))}
      </group>
      <Arc radius={config.coreRadius * 1.05} color={blue} tube={0.005} opacity={0.9} />
      <Arc radius={config.coreRadius * 1.5} color={blue} tube={0.0015} opacity={0.16} />
      <GlowPoints positions={ORIGIN} color={config.coreColor} size={config.coreRadius * 1.4} clock={clock} intensity={5} />
    </group>
  )
}

const ORBIT_TILTS = [[1.14, 0.15, 0.36], [1.3, -0.25, -0.54], [0.3, 1.2, 0.4]]

function Orbit({ config, clock, index }: LayerProps & { index: number }) {
  const group = useRef<THREE.Group>(null)
  const runner = useRef<THREE.Group>(null)
  const tilt = ORBIT_TILTS[index % ORBIT_TILTS.length]
  const radius = config.shellRadius * (0.76 + (index % 3) * 0.075)
  const gold = useMemo(() => illuminated(config.color, 2.2), [config.color])
  useFrame(() => {
    const t = clock.current * config.ringSpeed
    if (group.current) group.current.rotation.set(tilt[0] + Math.sin(t * 0.55 + index) * 0.16, tilt[1] + t * (index % 2 ? -0.7 : 0.6), tilt[2] + Math.sin(t * 0.3) * 0.35)
    if (runner.current) runner.current.rotation.z = clock.current * config.particleSpeed * (index % 2 ? -1.2 : 1) + index * 2.2
  })

  return (
    <group ref={group}>
      <mesh>
        <ringGeometry args={[radius - config.ringWidth / 2, radius + config.ringWidth / 2, 192]} />
        <meshBasicMaterial color={config.glassColor} transparent opacity={0.38} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <Arc radius={radius - config.ringWidth / 2} tube={0.006} color={gold} opacity={0.9} />
      <Arc radius={radius + config.ringWidth / 2} tube={0.005} color={gold} opacity={0.8} />
      <Arc radius={radius} tube={0.003} color={gold} opacity={0.35} z={0.01} />
      <group ref={runner}>
        <Arc radius={radius} tube={config.ringWidth * 0.15} length={0.85} color={illuminated(config.color, 3)} opacity={0.85} />
        <group position={[radius, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.045 + (index % 3) * 0.009, 16, 12]} />
            <meshBasicMaterial color={gold} transparent opacity={0.75} toneMapped={false} />
          </mesh>
          <GlowPoints positions={ORIGIN} color={config.color} size={0.23} clock={clock} intensity={2.5} />
        </group>
      </group>
    </group>
  )
}

function createShellPanel(radius: number, start: number, span: number, latitude: number) {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const columns = 24
  const rows = 8
  for (let y = 0; y <= rows; y++) {
    const lat = (y / rows - 0.5) * latitude * 2
    for (let x = 0; x <= columns; x++) {
      const angle = start + (x / columns) * span
      const normal = [Math.cos(lat) * Math.cos(angle), Math.cos(lat) * Math.sin(angle), Math.sin(lat)]
      positions.push(...normal.map((value) => value * radius))
      normals.push(...normal)
      uvs.push(x / columns, y / rows)
      if (x < columns && y < rows) {
        const a = y * (columns + 1) + x
        const b = a + columns + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

function ShellPanel({ config, index }: { config: AICoreConfig; index: number }) {
  const start = (index / config.shellSegments) * TAU + 0.1
  const span = Math.min(0.5, TAU / config.shellSegments * 0.52)
  const latitude = index % 3 === 0 ? 0.21 : 0.13
  const panel = useMemo(() => createShellPanel(config.shellRadius, start, span, latitude), [config.shellRadius, start, span, latitude])
  useEffect(() => () => panel.dispose(), [panel])
  const edgeRadius = config.shellRadius * Math.cos(latitude)
  const depth = config.shellRadius * Math.sin(latitude)
  const gold = useMemo(() => illuminated(config.color, 1.7), [config.color])

  return (
    <group>
      <mesh geometry={panel}>
        <GlassMaterial color={config.color} glassColor={config.glassColor} opacity={config.shellOpacity} />
      </mesh>
      <Arc radius={edgeRadius} start={start} length={span} z={depth} tube={0.004} color={gold} opacity={0.85} />
      <Arc radius={edgeRadius} start={start} length={span} z={-depth} tube={0.004} color={gold} opacity={0.75} />
      <Arc radius={config.shellRadius * 0.972} start={start + 0.05} length={span * 0.8} tube={0.002} color={gold} opacity={0.75} />
      <Arc radius={config.shellRadius * 1.015} start={start + span + 0.04} length={span * 0.5} tube={0.003} color={gold} opacity={0.35} />
    </group>
  )
}

function Shell({ config, clock }: LayerProps) {
  const group = useRef<THREE.Group>(null)
  const ticks = useMemo(() => {
    const positions: number[] = []
    const count = 144
    for (let i = 0; i < count; i++) {
      if (i % 7 === 0) continue
      const angle = (i / count) * TAU
      const radius = config.shellRadius * 0.988
      const length = i % 6 === 0 ? 0.055 : 0.021
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
      positions.push(Math.cos(angle) * (radius - length), Math.sin(angle) * (radius - length), 0)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [config.shellRadius])
  useEffect(() => () => ticks.dispose(), [ticks])
  useFrame(() => {
    if (!group.current) return
    const t = clock.current * config.shellSpeed
    group.current.rotation.set(0.1 + Math.sin(t * 0.7) * 0.12, 0.28 + Math.sin(t) * 0.5, t + 0.22)
  })

  if (!config.shellSegments) return null
  return (
    <group ref={group}>
      <Arc radius={config.shellRadius} color={config.glassColor} tube={0.009} opacity={0.38} />
      <Arc radius={config.shellRadius * 0.98} color={config.color} tube={0.002} opacity={0.35} />
      <Arc radius={config.shellRadius * 1.008} color={config.color} tube={0.002} opacity={0.45} />
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color={config.color} transparent opacity={0.6} toneMapped={false} depthWrite={false} />
      </lineSegments>
      {Array.from({ length: config.shellSegments }, (_, i) => <ShellPanel key={i} config={config} index={i} />)}
    </group>
  )
}

function Satellites({ config, clock }: LayerProps) {
  const group = useRef<THREE.Group>(null)
  const blueOrbit = useRef<THREE.Group>(null)
  const positions = useMemo(() => {
    const random = seededRandom(config.seed)
    const values: number[] = []
    for (let i = 0; i < config.particleCount; i++) {
      const angle = random() * TAU
      const radius = config.shellRadius * (0.76 + random() * 0.3)
      const tilt = random() * 0.9 - 0.45
      values.push(Math.cos(angle) * radius, Math.sin(angle) * radius * Math.cos(tilt), Math.sin(angle) * radius * Math.sin(tilt))
    }
    return new Float32Array(values)
  }, [config.particleCount, config.shellRadius, config.seed])
  const blue = useMemo(() => illuminated(config.coreColor, 1.8), [config.coreColor])
  useFrame(() => {
    const t = clock.current * config.particleSpeed
    if (group.current) group.current.rotation.set(0.2, Math.sin(t * 0.3) * 0.3, -t * 0.4)
    if (blueOrbit.current) blueOrbit.current.rotation.set(0.9, t * 0.3, t * 0.7)
  })

  return (
    <>
      <group ref={group}>
        <GlowPoints positions={positions} color={config.color} size={0.16} clock={clock} intensity={2.4} />
        {Array.from({ length: Math.min(config.particleCount, 12) }, (_, i) => (
          <group key={i} position={[positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]}>
            <mesh>
              <sphereGeometry args={[0.032 + (i % 4) * 0.012, 16, 12]} />
              <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={0.35} metalness={0.35} roughness={0.18} transparent opacity={0.9} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.037 + (i % 4) * 0.012, 10, 6]} />
              <meshBasicMaterial color={config.color} transparent opacity={0.08} wireframe toneMapped={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={blueOrbit}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[i * 0.85, i * 0.48, i * 2.1]}>
            <Arc radius={config.networkRadius * (1.05 + i * 0.12)} length={3.8} tube={0.0025} color={blue} opacity={0.28} />
            <Arc radius={config.networkRadius * (1.05 + i * 0.12)} start={2.5} length={0.65} tube={0.005} color={blue} opacity={0.9} />
          </group>
        ))}
      </group>
    </>
  )
}

function Scene({ config, paused, hidden }: { config: AICoreConfig; paused: boolean; hidden: boolean }) {
  const clock = useRef(0)
  const group = useRef<THREE.Group>(null)
  const viewport = useThree((state) => state.viewport)
  const invalidate = useThree((state) => state.invalidate)
  const diameter = Math.max(config.shellRadius * 2.2, config.networkRadius * 2.2, config.coreRadius * 3)
  const scale = Math.min(viewport.width * 0.92, viewport.height * 0.84) / diameter * config.scale

  useEffect(() => { invalidate() }, [config, paused, hidden, invalidate])
  useFrame((_, delta) => {
    if (!paused && !hidden) clock.current += Math.min(delta, 0.05) * config.speed
    if (group.current) group.current.position.y = Math.sin(clock.current * 0.35) * 0.014 * scale
  }, -1)

  return (
    <>
      <color attach="background" args={[config.background]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <group ref={group} scale={scale} rotation={[0.03, 0, -0.04]}>
        <NeuralNetwork config={config} clock={clock} />
        <Nucleus config={config} clock={clock} />
        {Array.from({ length: config.ringCount }, (_, i) => <Orbit key={i} index={i} config={config} clock={clock} />)}
        <Shell config={config} clock={clock} />
        <Satellites config={config} clock={clock} />
      </group>
      <EffectComposer multisampling={4}>
        <Bloom intensity={config.glow} luminanceThreshold={0.9} luminanceSmoothing={0.3} mipmapBlur={false} resolutionScale={0.5} />
      </EffectComposer>
    </>
  )
}

export function CoreCanvas({ config, paused, hidden }: { config: AICoreConfig; paused: boolean; hidden: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 42, near: 0.1, far: 30 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      frameloop={paused || hidden || config.speed === 0 ? 'demand' : 'always'}
      fallback={<span className="md-typescale-body-small">WebGL is required to display this animation.</span>}
    >
      <Scene config={config} paused={paused} hidden={hidden} />
    </Canvas>
  )
}
