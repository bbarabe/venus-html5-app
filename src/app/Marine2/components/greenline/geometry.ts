/**
 * Dial geometry, taken off the Greenline HMI's own widget definitions.
 *
 * The HMI draws its round gauges in a 396 x 396 box with the sweep running
 * from 225 deg (bottom left) clockwise to -45 deg (bottom right) - 270 deg of
 * travel with a 90 deg gap at the bottom for the readout. Radii below are
 * measured from the rendered page, so the ring, ticks and labels land exactly
 * where the OPBOX puts them.
 */
export const DIAL = {
  size: 396,
  center: 198,
  startAngle: 225,
  sweep: -270,
  /** Number of labelled major ticks (5 intervals between them). */
  majorTicks: 6,
  /** Sub-intervals per major interval; 4 minor marks sit inside each. */
  minorPerMajor: 5,
  rpm: {
    ringRadius: 177,
    ringWidth: 12,
    tickOuter: 183.5,
    tickMajorInner: 171,
    tickMinorInner: 179.5,
    labelRadius: 150,
    pointerRadius: 127,
  },
  power: {
    ringRadius: 107.5,
    ringWidth: 5,
    tickOuter: 109.5,
    tickMajorInner: 103,
    tickMinorInner: 107.5,
    labelRadius: 97,
  },
}

/** Fraction (0..1) of the dial travel -> angle in degrees, maths convention. */
export const angleForFraction = (fraction: number) => DIAL.startAngle + DIAL.sweep * fraction

/** Polar -> SVG coordinates, remembering that SVG y grows downwards. */
export const pointAt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: DIAL.center + radius * Math.cos(rad),
    y: DIAL.center - radius * Math.sin(rad),
  }
}

export const clampFraction = (value: number, max: number) => {
  if (!max || !isFinite(value)) return 0
  return Math.min(Math.max(value / max, 0), 1)
}

/**
 * Arc path from the dial's zero up to `fraction`, drawn clockwise on screen.
 * Returns undefined for a zero-length arc so nothing is painted at rest.
 */
export const arcTo = (fraction: number, radius: number) => {
  if (fraction <= 0) return undefined
  const from = pointAt(DIAL.startAngle, radius)
  const to = pointAt(angleForFraction(fraction), radius)
  const largeArc = fraction * 270 > 180 ? 1 : 0
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`
}

/** The tick marks for one ring, as a single path string. */
export const ticksPath = (outer: number, inner: number, count: number) => {
  const segments: string[] = []
  for (let i = 0; i < count; i++) {
    const angle = angleForFraction(i / (count - 1))
    const a = pointAt(angle, outer)
    const b = pointAt(angle, inner)
    segments.push(`M${a.x} ${a.y}L${b.x} ${b.y}`)
  }
  return segments.join(" ")
}

/** Minor ticks: the sub-divisions between majors, majors themselves omitted. */
export const minorTicksPath = (outer: number, inner: number) => {
  const intervals = (DIAL.majorTicks - 1) * DIAL.minorPerMajor
  const segments: string[] = []
  for (let i = 1; i < intervals; i++) {
    if (i % DIAL.minorPerMajor === 0) continue
    const angle = angleForFraction(i / intervals)
    const a = pointAt(angle, outer)
    const b = pointAt(angle, inner)
    segments.push(`M${a.x} ${a.y}L${b.x} ${b.y}`)
  }
  return segments.join(" ")
}

/** Evenly spaced dial labels and where to put them. */
export const dialLabels = (max: number, radius: number, decimals = 0) =>
  Array.from({ length: DIAL.majorTicks }, (_, i) => {
    const fraction = i / (DIAL.majorTicks - 1)
    const { x, y } = pointAt(angleForFraction(fraction), radius)
    return { key: i, text: (max * fraction).toFixed(decimals), x, y }
  })
