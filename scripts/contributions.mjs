// Draws the last year of contributions with Yuyu walking under the grid,
// lighting each week as he passes. Reads the calendar from GitHub's GraphQL API.
// Usage: GITHUB_TOKEN=... node scripts/contributions.mjs <out.svg> [--sample]
import { readFileSync, writeFileSync } from 'node:fs'

const LOGIN = 'yvr1x02'
const [out, flag] = process.argv.slice(2)

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

export function draw({ total, weeks }) {
  const CELL = 14, GAP = 4, STEP = CELL + GAP
  const PAD = 28, TOP = 92
  const gridW = weeks.length * STEP - GAP
  const W = gridW + PAD * 2
  const groundY = TOP + 7 * STEP + 90
  const H = groundY + PAD
  const COLORS = ['#18181E', '#5A1820', '#8E1E2A', '#D62839', '#FF6B76']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Yuyu walks from off the left edge to off the right edge, then the loop waits a little.
  const SPRITE = 48, SCALE = 1.6
  const startX = PAD - SPRITE * SCALE, endX = W
  const WALK = 20, LOOP = 27
  const at = (x) => ((x - SPRITE * SCALE * 0.5 - startX) / (endX - startX)) * WALK

  const css = [
    '@keyframes show{from{opacity:0}}',
    `@keyframes walk{from{transform:translateX(${startX}px)}${((WALK / LOOP) * 100).toFixed(2)}%,to{transform:translateX(${endX}px)}}`,
    `@keyframes frames{to{transform:translateX(-${SPRITE * 6}px)}}`,
    // A week lights up when Yuyu reaches it and fades just before he comes back.
    '@keyframes lit{0%{opacity:.16}3%{opacity:1}84%{opacity:1}93%,100%{opacity:.16}}',
    `.yuyu{animation:walk ${LOOP}s linear infinite}`,
    '.frames{animation:frames .75s steps(6) infinite}',
    '.head{animation:show .6s .2s backwards}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.yuyu{transform:translateX(' + (W - PAD - SPRITE * SCALE) + 'px)}}',
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
    css.push(`.w${c}{animation:lit ${LOOP}s linear ${at(x + CELL / 2).toFixed(2)}s infinite backwards}`)
    for (const day of days) {
      const r = new Date(day.date + 'T00:00:00Z').getUTCDay()
      const y = TOP + r * STEP
      const cls = day.level ? ` class="w${c}"` : ''
      cells.push(`<rect${cls} x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${COLORS[day.level]}"/>`)
    }
  })

  const LX = W - PAD - 46 - 5 * STEP + GAP
  const legend = COLORS.map((col, i) => `<rect x="${LX + i * STEP}" y="34" width="${CELL}" height="${CELL}" rx="3" fill="${col}"/>`).join('')
  const sheet = readFileSync(new URL('../assets/yuyu-walk.png', import.meta.url)).toString('base64')
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">${total} contributions in the last year, with Yuyu walking under the calendar.</title>
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
<g class="yuyu"><svg x="0" y="${groundY - 64 * SCALE + 2 * SCALE}" width="${SPRITE * SCALE}" height="${64 * SCALE}" viewBox="0 0 ${SPRITE} 64" overflow="hidden"><image class="frames" href="data:image/png;base64,${sheet}" width="${SPRITE * 6}" height="64" style="image-rendering:pixelated"/></svg></g>
</svg>
`
}

if (out) {
  const data = flag === '--sample' ? sampleCalendar() : await fetchCalendar()
  writeFileSync(out, draw(data))
  console.log(`contributions: ${data.total}`)
}
