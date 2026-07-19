export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return 'n/a'
  return `${formatNumber(value * 100, digits)}%`
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return 'n/a'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(value: string): string {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function shortSha(value: string): string {
  return value.slice(0, 9)
}

export function moduleColor(name: string): string {
  let hash = 0
  for (const character of name) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 1_677_761)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 68% 61%)`
}
