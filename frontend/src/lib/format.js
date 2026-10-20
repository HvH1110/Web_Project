const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

// "SGD 13,450", "VND 255,555,000". Currency codes rather than symbols, so
// three markets read the same way side by side.
export const formatPrice = (value, currency) => `${currency}\u00a0${amount.format(value)}`

// 1 -> "01"
export const pad2 = (n) => String(n).padStart(2, '0')

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// "12 Oct 2026"
export const formatDate = (iso) => day.format(new Date(iso))

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

// Axis labels: 255555000 -> "255.6M", 13450 -> "13.5K"
export const formatCompact = (value) => compact.format(value)

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const yearOnly = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' })

// Time axis ticks: "Oct 26", or "2026" for yearly ticks
export const formatMonth = (ms) => monthYear.format(ms)
export const formatYear = (ms) => yearOnly.format(ms)
