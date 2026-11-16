// US equity market session (NYSE/Nasdaq), computed in America/New_York time.
const TZ = 'America/New_York'

// Full-day closures and 1:00 pm early closes. Covers 2026–2027; check the exchange calendar for later years.
const HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'New Year’s Day', '2026-01-19': 'Martin Luther King Jr. Day', '2026-02-16': 'Washington’s Birthday',
  '2026-04-03': 'Good Friday', '2026-05-25': 'Memorial Day', '2026-06-19': 'Juneteenth', '2026-07-03': 'Independence Day (observed)',
  '2026-09-07': 'Labor Day', '2026-11-26': 'Thanksgiving Day', '2026-12-25': 'Christmas Day',
  '2027-01-01': 'New Year’s Day', '2027-01-18': 'Martin Luther King Jr. Day', '2027-02-15': 'Washington’s Birthday',
  '2027-03-26': 'Good Friday', '2027-05-31': 'Memorial Day', '2027-06-18': 'Juneteenth (observed)', '2027-07-05': 'Independence Day (observed)',
  '2027-09-06': 'Labor Day', '2027-11-25': 'Thanksgiving Day', '2027-12-24': 'Christmas Day (observed)'
}
const EARLY_CLOSE: Record<string, string> = { '2026-11-27': 'Day after Thanksgiving', '2026-12-24': 'Christmas Eve', '2027-11-26': 'Day after Thanksgiving' }

function nyParts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: p.weekday as string, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** UTC instant for a wall-clock time in New York. */
function nyToUtc(date: string, minutes: number) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60)
  const offsetAt = (t: number) => {
    const p = nyParts(new Date(t))
    const [py, pm, pd] = p.date.split('-').map(Number) as [number, number, number]
    return Date.UTC(py, pm - 1, pd, Math.floor(p.minutes / 60), p.minutes % 60) - t
  }
  let utc = guess - offsetAt(guess)
  utc = guess - offsetAt(utc)
  return new Date(utc)
}

function dayInfo(date: string, weekday: string) {
  if (weekday === 'Sat' || weekday === 'Sun') return { trading: false, reason: 'Weekend', close: 0 }
  if (HOLIDAYS[date]) return { trading: false, reason: HOLIDAYS[date]!, close: 0 }
  return { trading: true, reason: EARLY_CLOSE[date] ? `Early close (${EARLY_CLOSE[date]})` : 'Regular trading day', close: EARLY_CLOSE[date] ? 13 * 60 : 16 * 60 }
}

export function marketStatus(at = new Date()) {
  const now = nyParts(at)
  const today = dayInfo(now.date, now.weekday)
  const OPEN = 9 * 60 + 30
  let session: 'pre-market' | 'regular' | 'after-hours' | 'closed' = 'closed'
  if (today.trading) {
    if (now.minutes >= OPEN && now.minutes < today.close) session = 'regular'
    else if (now.minutes >= 4 * 60 && now.minutes < OPEN) session = 'pre-market'
    else if (now.minutes >= today.close && now.minutes < 20 * 60) session = 'after-hours'
  }

  // Next regular-session open.
  let nextOpen: Date | null = null
  for (let i = 0; i < 10 && !nextOpen; i++) {
    const probe = new Date(at.getTime() + i * 86_400_000)
    const p = nyParts(probe)
    const info = dayInfo(p.date, p.weekday)
    if (info.trading && (i > 0 || now.minutes < OPEN)) nextOpen = nyToUtc(p.date, OPEN)
  }

  return {
    exchange: 'NYSE / Nasdaq',
    timeInNewYork: `${now.date} ${String(Math.floor(now.minutes / 60)).padStart(2, '0')}:${String(now.minutes % 60).padStart(2, '0')}`,
    session,
    regularSessionOpen: session === 'regular',
    day: today.reason,
    closesAt: session === 'regular' ? nyToUtc(now.date, today.close).toISOString() : null,
    nextRegularOpen: nextOpen?.toISOString() ?? null,
    note: 'Robinhood stock tokens trade 24/7 on Robinhood Chain, so on-chain prices can move while the exchange is closed. Holiday calendar covers 2026–2027.'
  }
}
