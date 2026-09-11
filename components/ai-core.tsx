'use client'

import dynamic from 'next/dynamic'
import { useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react'
import { resolveCoreConfig, type AICoreConfig } from '@/lib/ai-core-config'

const CoreCanvas = dynamic(() => import('./ai-core-scene').then((module) => module.CoreCanvas), { ssr: false })

export type AICoreHandle = {
  configure: (settings: Partial<AICoreConfig>) => void
  play: () => void
  pause: () => void
  reset: () => void
}

export function AICore({ config, ref }: { config?: Partial<AICoreConfig>; ref?: Ref<AICoreHandle> }) {
  const [overrides, setOverrides] = useState<Partial<AICoreConfig>>({})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hidden, setHidden] = useState(false)
  const settings = useMemo(() => resolveCoreConfig({ ...config, ...overrides }), [config, overrides])

  useImperativeHandle(ref, () => ({
    configure: (patch) => setOverrides((current) => ({ ...current, ...patch })),
    play: () => setOverrides((current) => ({ ...current, paused: false, respectReducedMotion: false })),
    pause: () => setOverrides((current) => ({ ...current, paused: true })),
    reset: () => setOverrides({}),
  }), [])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(preference.matches)
    const updateVisibility = () => setHidden(document.hidden)
    updateMotion()
    updateVisibility()
    preference.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      preference.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  const paused = settings.paused || (settings.respectReducedMotion && reducedMotion)

  return (
    <div
      className="ai-core-canvas"
      data-paused={paused}
      role="img"
      aria-label="Animated golden orbital rings and a luminous blue AI core. Press Space to pause or resume."
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        if (event.key === ' ') {
          event.preventDefault()
          setOverrides((current) => ({ ...current, paused: !paused, respectReducedMotion: false }))
        }
      }}
    >
      <CoreCanvas config={settings} paused={paused} hidden={hidden} />
    </div>
  )
}
