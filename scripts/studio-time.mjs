// Writes the studio banner for the current hour in Rome: day, dusk or night.
// The night version is the master in assets/studio.svg; day and dusk are derived from it.
// Usage: node scripts/studio-time.mjs <out.svg> [day|dusk|night]
import { readFileSync, writeFileSync } from 'node:fs'

const [out, forced] = process.argv.slice(2)

export function phaseAt(date) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(date)
  )
  if (hour >= 8 && hour < 18) return 'day'
  if ((hour >= 6 && hour < 8) || (hour >= 18 && hour < 21)) return 'dusk'
  return 'night'
}

const GLASS = 'd="M1096 401.9 L1156.4 436.7 L1156.4 309.9 L1096 275 Z" fill="rgb(13,16,24)"'

const PHASES = {
  day: {
    sky: [['0', 'rgb(118,158,204)'], ['1', 'rgb(196,210,226)']],
    city: 'rgb(78,92,112)',
    beam: ['rgb(255,240,210)', 0.3, 0.1],
    lamp: false,
    light: ['rgb(214,224,240)', 0.5],
  },
  dusk: {
    sky: [['0', 'rgb(58,52,104)'], ['0.55', 'rgb(206,104,96)'], ['1', 'rgb(246,170,104)']],
    city: 'rgb(38,28,46)',
    beam: ['rgb(255,170,112)', 0.26, 0.06],
    lamp: true,
    light: ['rgb(246,170,120)', 0.32],
  },
}

function replaceOnce(s, from, to) {
  if (!s.includes(from)) throw new Error(`studio.svg changed: missing ${from.slice(0, 60)}`)
  return s.replace(from, to)
}

export function studioFor(master, phase) {
  if (phase === 'night') return master
  const p = PHASES[phase]
  let s = master
  const stops = p.sky.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')
  s = replaceOnce(s, '<defs><clipPath id="c0">',
    `<defs><linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="275" x2="0" y2="437">${stops}</linearGradient><clipPath id="c0">`)
  s = replaceOnce(s, GLASS, GLASS.replace('rgb(13,16,24)', 'url(#sky)'))
  // The buildings outside, the moon and its halo, the rain.
  s = s.replaceAll('clip-path="url(#room-clip-glass)" fill="rgb(18,20,28)"', `clip-path="url(#room-clip-glass)" fill="${p.city}"`)
  s = s.replaceAll('fill="url(&quot;#room-moon-halo&quot;)"', 'fill="none"')
  s = replaceOnce(s, 'opacity="0.85" fill="rgb(228,228,231)"', 'opacity="0" fill="rgb(228,228,231)"')
  s = replaceOnce(s, 'class="rain"', 'opacity="0"')
  // The light on the floor comes from the sun instead of the moon.
  s = replaceOnce(s,
    '<linearGradient id="room-moon-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgb(200,210,230)" stop-opacity="0.17"></stop><stop offset="1" stop-color="rgb(200,210,230)" stop-opacity="0.05"></stop></linearGradient>',
    `<linearGradient id="room-moon-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.beam[0]}" stop-opacity="${p.beam[1]}"></stop><stop offset="1" stop-color="${p.beam[0]}" stop-opacity="${p.beam[2]}"></stop></linearGradient>`)
  if (!p.lamp) {
    // Lamp off: its pools of warm light go dark.
    s = s.replace(/(<(?:radial|linear)Gradient id="room-warm-[a-z]+"[^>]*>)(.*?)(<\/(?:radial|linear)Gradient>)/g,
      (_, a, body, c) => a + body.replace(/stop-opacity="[\d.]+"/g, 'stop-opacity="0"') + c)
  }
  // Daylight from the window brightens the pool of light on the floor.
  s = replaceOnce(s,
    '<radialGradient id="room-cool-pool"><stop offset="0" stop-color="rgb(174,191,224)" stop-opacity="0.3"></stop>',
    `<radialGradient id="room-cool-pool"><stop offset="0" stop-color="${p.light[0]}" stop-opacity="${p.light[1]}"></stop>`)
  s = s.replace('An isometric studio at night', phase === 'day' ? 'An isometric studio by day' : 'An isometric studio at dusk')
  return s
}

if (out) {
  const master = readFileSync(new URL('../assets/studio.svg', import.meta.url), 'utf8')
  const phase = forced || phaseAt(new Date())
  writeFileSync(out, studioFor(master, phase))
  console.log(`studio: ${phase}`)
}
