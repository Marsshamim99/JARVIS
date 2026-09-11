export type AICoreConfig = {
  paused: boolean
  respectReducedMotion: boolean
  speed: number
  scale: number
  rotationSpeed: number
  ringSpeed: number
  shellSpeed: number
  particleSpeed: number
  pulseSpeed: number
  pulseAmount: number
  glow: number
  color: string
  coreColor: string
  glassColor: string
  background: string
  networkRadius: number
  coreRadius: number
  shellRadius: number
  networkDetail: number
  nodeSize: number
  particleCount: number
  ringCount: number
  ringWidth: number
  shellSegments: number
  shellOpacity: number
  seed: number
}

// Change these values to control the animation. Speeds are radians per second.
export const AI_CORE_CONFIG: AICoreConfig = {
  paused: false,
  respectReducedMotion: true,
  speed: 1,
  scale: 1,
  rotationSpeed: 0.14,
  ringSpeed: 0.25,
  shellSpeed: 0.09,
  particleSpeed: 0.3,
  pulseSpeed: 1.6,
  pulseAmount: 0.055,
  glow: 0.8,
  color: '#ff9b43',
  coreColor: '#168cff',
  glassColor: '#6478b5',
  background: '#000000',
  networkRadius: 1.52,
  coreRadius: 0.4,
  shellRadius: 2.32,
  networkDetail: 3,
  nodeSize: 0.23,
  particleCount: 24,
  ringCount: 3,
  ringWidth: 0.08,
  shellSegments: 6,
  shellOpacity: 0.24,
  seed: 42,
}

export function resolveCoreConfig(patch: Partial<AICoreConfig> = {}): AICoreConfig {
  const config = { ...AI_CORE_CONFIG, ...patch }
  const bounded = (value: number, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

  for (const key of ['speed', 'rotationSpeed', 'ringSpeed', 'shellSpeed', 'particleSpeed', 'pulseSpeed'] as const) {
    config[key] = bounded(config[key], AI_CORE_CONFIG[key], -10, 10)
  }
  config.scale = bounded(config.scale, 1, 0.1, 3)
  config.glow = bounded(config.glow, 0.95, 0, 5)
  config.pulseAmount = bounded(config.pulseAmount, 0.055, 0, 0.4)
  config.networkRadius = bounded(config.networkRadius, 1.52, 0.2, 4)
  config.coreRadius = bounded(config.coreRadius, 0.4, 0.05, 2)
  config.shellRadius = bounded(config.shellRadius, 2.32, 0.5, 6)
  config.networkDetail = Math.round(bounded(config.networkDetail, 2, 0, 5))
  config.nodeSize = bounded(config.nodeSize, 0.17, 0.01, 0.5)
  config.particleCount = Math.round(bounded(config.particleCount, 24, 0, 300))
  config.ringCount = Math.round(bounded(config.ringCount, 3, 0, 8))
  config.ringWidth = bounded(config.ringWidth, 0.055, 0.005, 0.2)
  config.shellSegments = Math.round(bounded(config.shellSegments, 6, 0, 18))
  config.shellOpacity = bounded(config.shellOpacity, 0.24, 0, 1)
  config.seed = bounded(config.seed, 42, 0, 2147483647)
  return config
}
