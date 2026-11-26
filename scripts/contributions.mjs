// Draws the last year of contributions with Yuyu under the grid, following the time of day in
// Rome: by day he skates through doing tricks and lights each week as he passes, at dusk he
// cruises and talks, at night he sleeps on his parked board. Reads the calendar from GitHub.
// Usage: GITHUB_TOKEN=... node scripts/contributions.mjs <out.svg> [--sample] [--phase=day|dusk|night]
import { readFileSync, writeFileSync } from 'node:fs'
import { phaseAt, dayOfYear } from './phase.mjs'

const LOGIN = 'yvr1x02'
const [out, ...flags] = process.argv.slice(2)
const sample = flags.includes('--sample')
const forcedPhase = flags.find((f) => f.startsWith('--phase='))?.slice(8)

// Today's line for Yuyu's speech bubble, from scripts/yuyu-says.txt: one a day, in order.
export function sayingFor(date) {
  const lines = readFileSync(new URL('./yuyu-says.txt', import.meta.url), 'utf8')
    .split('\n').map((l) => l.trim()).filter(Boolean)
  return lines[dayOfYear(date) % lines.length]
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function fetchCalendar() {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  })
  const json = await res.json()
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${res.status} ${JSON.stringify(json.errors ?? json)}`)
  const cal = json.data.user.contributionsCollection.contributionCalendar
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 }
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, level: LEVEL[d.contributionLevel] }))),
  }
}

// Made-up data with a believable rhythm, for previews without a token.
function sampleCalendar() {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const weeks = []
  let total = 0
  const start = new Date(Date.UTC(2025, 10, 23))
  for (let w = 0; w < 53; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 864e5)
      const busy = 0.35 + 0.5 * (w / 53) - (d === 0 || d === 6 ? 0.25 : 0)
      const level = rnd() < busy ? 1 + Math.floor(rnd() * 4) : 0
      total += level * 3
      days.push({ date: date.toISOString().slice(0, 10), level })
    }
    weeks.push(days)
  }
  return { total, weeks }
}

export function draw({ total, weeks }, { phase = 'day', says = '' } = {}) {
  const CELL = 14, GAP = 4, STEP = CELL + GAP
  const PAD = 28, TOP = 92
  const gridW = weeks.length * STEP - GAP
  const W = gridW + PAD * 2
  const groundY = TOP + 7 * STEP + 118
  const H = groundY + PAD
  const COLORS = ['#18181E', '#5A1820', '#8E1E2A', '#D62839', '#FF6B76']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // By day Yuyu skates in from the left, pushes, does an ollie, a kickflip and a shove-it, and
  // leaves on the right as the next loop brings him back in; at dusk he only cruises. At night he
  // stays put, asleep. Each strip is pre-built by yuyu-skate.py: one frame per tick.
  const run = JSON.parse(readFileSync(new URL(`../assets/yuyu-run-${phase}.json`, import.meta.url), 'utf8'))
  const moving = phase !== 'night'
  const SCALE = 1.4
  const FW = run.frameWidth * SCALE, FH = run.frameHeight * SCALE
  const LOOP = run.frames / run.fps
  const startX = -FW, endX = W
  // When the board's centre passes a point x.
  const at = (x) => ((x - run.boardCenterX * SCALE - startX) / (endX - startX)) * LOOP

  const css = [
    '@keyframes show{from{opacity:0}}',
    `@keyframes ride{from{transform:translateX(${startX}px)}to{transform:translateX(${endX}px)}}`,
    `@keyframes frames{to{transform:translateX(-${run.frameWidth * run.frames}px)}}`,
    // A week lights up when Yuyu reaches it and fades just before he comes back.
    '@keyframes lit{0%{opacity:.16}3%{opacity:1}84%{opacity:1}93%,100%{opacity:.16}}',
    moving ? `.yuyu{animation:ride ${LOOP}s linear infinite}` : `.yuyu{transform:translateX(${Math.round(W * 0.68)}px)}`,
    `.frames{animation:frames ${LOOP}s steps(${run.frames}) infinite}`,
    '.head{animation:show .6s .2s backwards}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.yuyu{transform:translateX(' + (W - PAD - FW) + 'px)}}',
  ]

  const cells = []
  let lastMonth = -1
  const months = []
  weeks.forEach((days, c) => {
    const x = PAD + c * STEP
    const first = new Date(days[0].date + 'T00:00:00Z')
    const m = first.getUTCMonth()
    if (m !== lastMonth && first.getUTCDate() <= 7 && c < weeks.length - 2) {
      months.push(`<text x="${x}" y="${TOP - 10}">${MONTHS[m]}</text>`)
    }
    lastMonth = m
    if (moving) css.push(`.w${c}{animation:lit ${LOOP}s linear ${at(x + CELL / 2).toFixed(2)}s infinite backwards}`)
    for (const day of days) {
      const r = new Date(day.date + 'T00:00:00Z').getUTCDay()
      const y = TOP + r * STEP
      // At night the weeks stay lit, but low, while he sleeps.
      const cls = day.level ? (moving ? ` class="w${c}"` : ' opacity=".55"') : ''
      cells.push(`<rect${cls} x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${COLORS[day.level]}"/>`)
    }
  })

  const LX = W - PAD - 46 - 5 * STEP + GAP
  const legend = COLORS.map((col, i) => `<rect x="${LX + i * STEP}" y="34" width="${CELL}" height="${CELL}" rx="3" fill="${col}"/>`).join('')
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  const sheet = readFileSync(new URL(`../assets/yuyu-run-${phase}.png`, import.meta.url)).toString('base64')
  const spriteY = groundY - (run.groundY + 1) * SCALE
  // The speech bubble rides along in front of his face; at night the frames have their own Zzz.
  let bubble = ''
  if (moving && says) {
    const bx = (run.bodyRight + 3) * SCALE, by = spriteY + run.headY * SCALE - 8
    const bw = Math.round(says.length * 7.8 + 24)
    bubble = `<g font-family="${mono}"><path d="M${bx + 2} ${by + 30} l-8 7 l16 -7z" fill="#18181E" stroke="#3F3F46" stroke-width="1.5" stroke-linejoin="round"/>`
      + `<rect x="${bx}" y="${by}" width="${bw}" height="30" rx="9" fill="#18181E" stroke="#3F3F46" stroke-width="1.5"/>`
      + `<path d="M${bx + 3} ${by + 29.2} h12" stroke="#18181E" stroke-width="2"/>`
      + `<text x="${bx + 12}" y="${by + 20}" font-size="13" fill="#FAFAFA">${esc(says)}</text></g>`
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">${total} contributions in the last year. ${moving ? `Yuyu skates under the calendar${says ? ` and says: ${esc(says)}` : ''}.` : 'Yuyu sleeps on his skateboard under the calendar.'}</title>
<style>
${css.join('\n')}
</style>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="#07070A" stroke="#27272A" stroke-width="2"/>
<g class="head" font-family="${mono}">
<text x="${PAD}" y="47" font-size="20" font-weight="700" fill="#FAFAFA">${total.toLocaleString('en-US')} <tspan fill="#A1A1AA" font-weight="400">contributions in the last year</tspan></text>
<text x="${LX - 10}" y="46" font-size="13" fill="#A1A1AA" text-anchor="end">less</text>${legend}<text x="${W - PAD}" y="46" font-size="13" fill="#A1A1AA" text-anchor="end">more</text>
</g>
<g font-family="${mono}" font-size="13" fill="#71717A">${months.join('')}</g>
${cells.join('\n')}
<path d="M${PAD} ${groundY} H${W - PAD}" stroke="#27272A" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>
<g class="yuyu"><svg x="0" y="${spriteY}" width="${FW}" height="${FH}" viewBox="0 0 ${run.frameWidth} ${run.frameHeight}" overflow="hidden"><image class="frames" href="data:image/png;base64,${sheet}" width="${run.frameWidth * run.frames}" height="${run.frameHeight}" style="image-rendering:pixelated"/></svg>${bubble}</g>
</svg>
`
}

if (out) {
  const now = new Date()
  const data = sample ? sampleCalendar() : await fetchCalendar()
  const phase = forcedPhase || phaseAt(now)
  writeFileSync(out, draw(data, { phase, says: sayingFor(now) }))
  console.log(`contributions: ${data.total}, ${phase}`)
}
