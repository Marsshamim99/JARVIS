'use client'

import { useEffect, useRef } from 'react'

export function AICore() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pausedByUser = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

    function updatePlayback() {
      if (!video) return

      if (document.hidden || motionPreference.matches || pausedByUser.current) {
        video.pause()
      } else {
        void video.play().catch(() => {})
      }
    }

    updatePlayback()
    motionPreference.addEventListener('change', updatePlayback)
    document.addEventListener('visibilitychange', updatePlayback)

    return () => {
      motionPreference.removeEventListener('change', updatePlayback)
      document.removeEventListener('visibilitychange', updatePlayback)
    }
  }, [])

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      pausedByUser.current = false
      void video.play().catch(() => {})
    } else {
      pausedByUser.current = true
      video.pause()
    }
  }

  return (
    <video
      ref={videoRef}
      className="ai-core-video"
      src="/media/ai-core.mp4"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={0}
      aria-label="Rotating AI core. Click or press Space to pause or resume the animation."
      onClick={togglePlayback}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          togglePlayback()
        }
      }}
    />
  )
}
