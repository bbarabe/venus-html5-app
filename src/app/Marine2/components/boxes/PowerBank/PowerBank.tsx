import React, { useMemo, useState } from "react"
import classNames from "classnames"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import { useAppStore, useSystemBatteries } from "@victronenergy/mfd-modules"
import Box from "../../ui/Box"
import StatusPill from "../../ui/StatusPill"
import GearIcon from "../../ui/GearIcon"
import { BatterySummary } from "../../ui/BatterySummary/BatterySummary"
import BatteriesIcon from "../../../images/icons/batteries.svg"
import PowerSettingsModal from "./PowerSettingsModal"
import { AppViews } from "../../../modules/AppViews"
import {
  cellSpreadMv,
  chargeStateLabel,
  DRIVE_BANK_BATTERY_IDS,
  GREENLINE_INSTANCES,
  recBmsAlarmLevel,
  useRecBms,
} from "../../../modules/Greenline"
import { sortBatteries } from "../../../utils/helpers/devices/batteries/sort-batteries"
import { formatValue } from "../../../utils/formatters/generic"
import { ISize } from "@m2Types/generic/size"

/** Six slots for the 12 V fleet, which is what fits on this boat's bus. */
const FLEET_SLOTS = 6

/**
 * One figure in the drive-bank tile. Label above value rather than beside it:
 * the pack's numbers carry long labels and longer units, and side-by-side rows
 * were truncating both.
 */
const Fact = ({ label, value, tone }: { label: string; value: string; tone?: "warn" }) => (
  <div className="min-w-0">
    <div className="text-xs text-content-secondary truncate">{label}</div>
    <div
      className={classNames(
        "text-base tabular-nums truncate",
        tone === "warn" ? "text-content-victronYellow" : "text-content-primary",
      )}
    >
      {value}
    </div>
  </div>
)

/**
 * Every battery on the boat in one block.
 *
 * The REC-BMS drive bank is the hero — it is the pack the boat moves on, and
 * the one panel that is always live — and it sits in the same frame as the
 * 12 V fleet rather than in a box of its own, so the whole electrical picture
 * is one glance. Six fleet slots are laid out whether or not they are filled,
 * which keeps the grid still as batteries come and go and means the block
 * never has to page.
 */
const PowerBank = () => {
  const bms = useRecBms(GREENLINE_INSTANCES.driveBattery)
  const { batteries } = useSystemBatteries()
  const { electricalPowerIndicator } = useAppStore()
  const [boxSize, setBoxSize] = useState<ISize>({ width: 0, height: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)

  const fleet = useMemo(
    () => sortBatteries((batteries ?? []).filter((b) => !DRIVE_BANK_BATTERY_IDS.includes(b.id))).slice(0, FLEET_SLOTS),
    [batteries],
  )

  const alarmLevel = recBmsAlarmLevel(bms)
  const leadFault = typeof bms.leadFault === "string" && bms.leadFault.length > 0
  const charging = (bms.current ?? 0) > 0.5
  const spread = cellSpreadMv(bms)

  const pill =
    alarmLevel >= 2
      ? { label: "ALARM", variant: "red" as const }
      : leadFault
        ? { label: "LEAD FAULT", variant: "yellow" as const }
        : alarmLevel === 1
          ? { label: "WARNING", variant: "yellow" as const }
          : { label: chargeStateLabel(bms.current), variant: charging ? ("green" as const) : ("gray" as const) }

  // Each fleet cell is a fifth of the block wide and half of it high; the
  // summary sizes its own donut and type from that.
  const cellSize: ISize = {
    width: Math.max(Math.round((boxSize.width - 32) / 5), 0),
    height: Math.max(Math.round((boxSize.height - 60) / 2), 0),
  }

  return (
    <Box
      icon={<BatteriesIcon className="text-content-victronGray w-7" />}
      title={translate("boxes.batteries")}
      linkedView={AppViews.BOX_BATTERIES_OVERVIEW}
      getBoxSizeCallback={setBoxSize}
      headerActions={<StatusPill label={pill.label} variant={pill.variant} />}
    >
      <div
        className="w-full h-full min-h-0 grid gap-2 pb-1"
        style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))", gridTemplateRows: "repeat(2, minmax(0,1fr))" }}
      >
        {/* The drive bank, two slots wide and two deep. No SoC ring here:
            the energy flow above already carries state of charge, voltage and
            current, so this tile spends its space on what that panel cannot
            show — the pack's condition. */}
        <div className="col-span-2 row-span-2 min-w-0 min-h-0 rounded-md bg-surface-tertiary p-3 flex flex-col">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="text-sm text-content-secondary truncate flex-1">{bms.customName ?? "Drive Battery"}</span>
            {bms.phase && <span className="text-xs text-content-tertiary shrink-0">{bms.phase}</span>}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Power settings"
              className="w-px-44 h-px-44 -mr-2 -my-2 p-2 flex items-center justify-center cursor-pointer text-content-victronBlue shrink-0"
            >
              <GearIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-x-4 gap-y-1 content-center">
            <Fact label="State of health" value={`${formatValue(bms.soh, 0)} %`} />
            <Fact
              label="Cell spread"
              value={spread === undefined ? "—" : `${formatValue(spread, 0)} mV`}
              tone={spread !== undefined && spread > 50 ? "warn" : undefined}
            />
            <Fact
              label="Cell min / max"
              value={`${formatValue(bms.minCellVoltage, 3)} / ${formatValue(bms.maxCellVoltage, 3)} V`}
            />
            <Fact
              label="Cell temp"
              value={`${formatValue(bms.minCellTemperature, 0)} / ${formatValue(bms.maxCellTemperature, 0)} °C`}
            />
            <Fact label="Charge target" value={`${formatValue(bms.targetChargeVoltage, 2)} V`} />
            <Fact label="Solar lead" value={`${formatValue(bms.solarLead, 2)} V`} />
            <Fact label="Charge limit" value={`${formatValue(bms.maxChargeCurrent, 0)} A`} />
            <Fact
              label="Consumed"
              value={`${formatValue(bms.consumedAmphours, 0)} of ${formatValue(bms.capacity, 0)} Ah`}
            />
          </div>
          {(leadFault || !!bms.boostActive || !!bms.boostWindowOpen) && (
            <div className="flex flex-wrap gap-2 shrink-0 pt-1">
              {leadFault && <StatusPill label={`Lead fault: ${bms.leadFault}`} variant="yellow" />}
              {!!bms.boostActive && <StatusPill label="Solar boost active" variant="green" />}
              {!bms.boostActive && !!bms.boostWindowOpen && <StatusPill label="Boost window open" variant="gray" />}
            </div>
          )}
        </div>

        {/* Six fixed 12 V slots. Empty ones stay as quiet placeholders so the
            grid does not rearrange itself when a sender drops off the bus. */}
        {Array.from({ length: FLEET_SLOTS }, (_, i) => {
          const battery = fleet[i]
          return (
            <div key={battery?.id ?? `slot-${i}`} className="min-w-0 min-h-0 rounded-md bg-surface-tertiary p-1">
              {battery ? (
                <BatterySummary
                  battery={battery}
                  boxSize={cellSize}
                  electricalPowerIndicator={electricalPowerIndicator}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-content-tertiary">—</div>
              )}
            </div>
          )
        })}
      </div>
      {settingsOpen ? <PowerSettingsModal onClose={() => setSettingsOpen(false)} /> : <></>}
    </Box>
  )
}

export default observer(PowerBank)
