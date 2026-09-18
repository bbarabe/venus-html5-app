import { describeSolarPriority, nativeSolarPriorityStatus, SolarPriorityStatus } from "./SolarPriority.provider"

const base: SolarPriorityStatus = {
  quattroConnected: 1,
  enabled: 1,
  controllerState: "shore",
  statusFill: "grey",
  oneWay: "",
  targetSoc: 55,
  hold: 1,
  preferRenewableEnergy: 1,
}

const rowsOf = (b: ReturnType<typeof describeSolarPriority>) =>
  Object.fromEntries(b.rows.map((r) => [r.label, r.value]))

describe("describeSolarPriority — what the skipper reads in Power settings", () => {
  it("night on shore under the floor: held where it is, charge now", () => {
    const b = describeSolarPriority({ ...base, daylight: 0, sustain: 1, preferRenewableEnergy: 0 }, 54.35)
    expect(b.headline).toEqual({ label: "Shore power · night", tone: "gray" })
    expect(rowsOf(b)).toEqual({
      Sun: "None until morning",
      Bank: "Held at 54 % until the sun returns",
      Quattro: "Charge now",
    })
  })

  it("day on shore, watching the sun: have vs need", () => {
    const b = describeSolarPriority({ ...base, daylight: 1, estimateW: 1011, needW: 483 })
    expect(b.headline).toEqual({ label: "Shore power", tone: "gray" })
    expect(rowsOf(b)).toEqual({
      Sun: "1,011 W of the 483 W the boat needs",
      Bank: "Holding around 55 %",
      Quattro: "Prefer solar",
    })
  })

  it("on the island with a shortfall on the budget", () => {
    const b = describeSolarPriority({
      ...base,
      controllerState: "solar",
      statusFill: "green",
      daylight: 1,
      deficitWh: 120,
    })
    expect(b.headline).toEqual({ label: "On solar · shore on standby", tone: "green" })
    expect(rowsOf(b).Sun).toBe("Carrying the boat · 120 Wh short so far")
  })

  it("a heavy load has the boat back on shore for a while", () => {
    const b = describeSolarPriority({ ...base, controllerState: "suspend", statusFill: "blue", daylight: 1 })
    expect(b.headline).toEqual({ label: "Shore power · heavy load", tone: "yellow" })
  })

  it("charging toward a far target on the sun's time", () => {
    const b = describeSolarPriority({
      ...base,
      daylight: 1,
      oneWay: "charge",
      targetSoc: 65,
      estimateW: 300,
      needW: 400,
    })
    expect(rowsOf(b).Bank).toBe("Charging to 65 % on the sun's time")
  })

  it("Solar Priority switched off: the sun rows go, the Quattro's own setting stays", () => {
    const b = describeSolarPriority({ ...base, enabled: 0, preferRenewableEnergy: 0 })
    expect(b.headline).toEqual({ label: "Shore power · Solar Priority off", tone: "gray" })
    expect(rowsOf(b)).toEqual({ Bank: "Holding around 55 %", Quattro: "Charge now" })
  })

  it("a fault reads red, a missing controller gray", () => {
    expect(describeSolarPriority({ ...base, statusFill: "red" }).headline.tone).toBe("red")
    expect(describeSolarPriority({}).headline).toEqual({ label: "Controller not on the bus", tone: "gray" })
  })
})

describe("nativeSolarPriorityStatus — the GX's own words for the Quattro's feature", () => {
  it("maps the toggle the way gui-v2 does", () => {
    expect(nativeSolarPriorityStatus({ quattroConnected: 1, preferRenewableEnergy: 0 })).toBe("Charge now")
    expect(nativeSolarPriorityStatus({ quattroConnected: 1, preferRenewableEnergy: 2 })).toBe("Charging to 100 %")
    expect(nativeSolarPriorityStatus({ quattroConnected: 1, preferRenewableEnergy: 1 })).toBe("Prefer solar")
    expect(nativeSolarPriorityStatus({ quattroConnected: 1, preferRenewableEnergy: 1, systemState: 244 })).toBe(
      "Prefer solar — sustaining",
    )
    expect(nativeSolarPriorityStatus({ quattroConnected: 1, generatorSelected: 1 })).toBe("Off on generator input")
    expect(nativeSolarPriorityStatus({ quattroConnected: 0 })).toBe("Unavailable")
  })
})
