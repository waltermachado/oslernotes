export function formatSignedPercent(delta: number) {
  const v = Number.isFinite(delta) ? delta : 0
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '-'
  return `${sign}${abs}%`
}

export function formatMaskedMoney(value: number, reveal: boolean) {
  if (!reveal) return 'R$ *****'
  const v = Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(v)
  return formatted
}

