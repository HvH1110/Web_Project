const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

// "SGD 13,450", "VND 255,555,000". Currency codes rather than symbols, so
// three markets read the same way side by side.
export const formatPrice = (value, currency) => `${currency}\u00a0${amount.format(value)}`

// 1 -> "01"
export const pad2 = (n) => String(n).padStart(2, '0')
