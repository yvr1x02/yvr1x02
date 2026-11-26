// The time of day in Rome, shared by the studio and the calendar.
export function phaseAt(date) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(date)
  )
  if (hour >= 8 && hour < 18) return 'day'
  if ((hour >= 6 && hour < 8) || (hour >= 18 && hour < 21)) return 'dusk'
  return 'night'
}

// Day of the year in Rome, for things that change once a day.
export function dayOfYear(date) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(date).split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5)
}
