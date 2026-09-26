"use client"

import { useEffect, useRef, useState } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
  circle: boolean
  life: number
}

const COLORS = ["#0700ff", "#0a0a0a", "#ffffff", "#b9b9c3", "#0700ff", "#ffffff"]

/**
 * Premium confetti burst for order confirmation — three staggered cannons
 * (center fountain + both flanks), damped physics, brand palette.
 * Honours prefers-reduced-motion (renders nothing).
 */
export function Confetti({ durationMs = 3200 }: { durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDone(true)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const particles: Particle[] = []
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const spawnBurst = (
      ox: number,
      oy: number,
      count: number,
      angle: number,
      spread: number,
      speed: [number, number]
    ) => {
      const w = window.innerWidth
      const h = window.innerHeight
      for (let i = 0; i < count; i++) {
        const a = angle + rand(-spread, spread)
        const s = rand(speed[0], speed[1])
        particles.push({
          x: ox * w,
          y: oy * h,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.22, 0.22),
          w: rand(5, 10),
          h: rand(4, 7),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          circle: Math.random() < 0.22,
          life: 1,
        })
      }
    }

    const start = performance.now()
    let fired = 0
    const CANNONS = [
      { at: 0, fn: () => spawnBurst(0.5, 0.44, 170, -Math.PI / 2, 0.65, [9, 17]) },
      { at: 340, fn: () => spawnBurst(0.1, 0.6, 130, -Math.PI / 3.2, 0.4, [11, 19]) },
      { at: 560, fn: () => spawnBurst(0.9, 0.6, 130, (-Math.PI * 2) / 3.2, 0.4, [11, 19]) },
      { at: 1100, fn: () => spawnBurst(0.5, 0.5, 90, -Math.PI / 2, 1.1, [6, 12]) },
    ]

    let raf = 0
    let last = start
    const tick = (now: number) => {
      const dt = Math.min((now - last) / (1000 / 60), 3)
      last = now
      const elapsed = now - start

      while (fired < CANNONS.length && elapsed >= CANNONS[fired].at) {
        CANNONS[fired].fn()
        fired++
      }

      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      const fading = elapsed > durationMs * 0.62
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += 0.16 * dt
        p.vx *= 0.992
        p.vy *= 0.996
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (fading) p.life -= 0.02 * dt

        if (p.life <= 0 || p.y > h + 40 || p.x < -60 || p.x > w + 60) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.circle) {
          ctx.beginPath()
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // gentle tumble — squash width with rotation for a paper feel
          const squash = Math.abs(Math.cos(p.rot * 1.4))
          ctx.fillRect((-p.w / 2) * squash, -p.h / 2, p.w * squash, p.h)
        }
        ctx.restore()
      }

      if (elapsed > durationMs && particles.length === 0) {
        setDone(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [durationMs])

  if (done) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80]"
    />
  )
}
