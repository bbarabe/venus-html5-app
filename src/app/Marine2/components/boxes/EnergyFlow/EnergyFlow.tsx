import React from "react"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import {
  useAcLoads,
  useActiveInValues,
  useActiveSource,
  useAppStore,
  useDcLoads,
  usePvCharger,
  useSystemState,
} from "@victronenergy/mfd-modules"
import Box from "../../ui/Box"
import StatusPill from "../../ui/StatusPill"
import { FlowCard, FlowLink, FlowValue } from "./FlowParts"
import EnergyIcon from "../../../images/icons/energy.svg"
import ShorePowerIcon from "../../../images/icons/shore-power.svg"
import InverterChargerIcon from "../../../images/icons/inverter-charger.svg"
import ACIcon from "../../../images/icons/ac.svg"
import DCIcon from "../../../images/icons/dc.svg"
import SolarIcon from "../../../images/icons/solar.svg"
import BatteryIcon from "../../../images/icons/battery.svg"
import ThermometerIcon from "../../../images/icons/thermometer.svg"
import { AppViews } from "../../../modules/AppViews"
import {
  chargeStateLabel,
  formatDuration,
  GREENLINE_INSTANCES,
  isShoreIgnored,
  useRecBms,
  useShoreIgnored,
} from "../../../modules/Greenline"
import { formatValue } from "../../../utils/formatters/generic"
import { phaseValueFor } from "../../../utils/formatters/phase/phase-value-for"
import { dcValueFor } from "../../../utils/formatters/phase/phase-value-for"
import { formatSystemStateFor } from "../../../utils/formatters/devices/inverter-charger/format-system-state-for"

const nodeIcon = "w-5 h-5"

/**
 * The energy overview drawn the way the Cerbo Touch draws it: six nodes on a
 * grid, joined by wires, so the shape of the system is readable at a glance
 * instead of having to be assembled from a list of numbers.
 *
 * Every figure comes from the same hooks the stock energy boxes use, so this
 * is a different arrangement of the same truth, not a second source for it.
 */
const EnergyFlow = () => {
  const { electricalPowerIndicator } = useAppStore()
  const { current: acInCurrent, power: acInPower } = useActiveInValues()
  const { phases: acInPhases } = useActiveSource()
  const { current: acCurrent, power: acPower, phases: acPhases } = useAcLoads()
  const dcLoads = useDcLoads()
  const pv = usePvCharger()
  const { systemState } = useSystemState()
  const bms = useRecBms(GREENLINE_INSTANCES.driveBattery)
  const shore = useShoreIgnored(GREENLINE_INSTANCES.vebus)

  const shoreIgnored = isShoreIgnored(shore)
  const shoreConnected = shore.activeInConnected === 1
  const shoreWatts = phaseValueFor(acInPhases, acInCurrent, acInPower, electricalPowerIndicator)
  const solarWatts = pv.power
  const charging = (bms.current ?? 0) > 0.5

  return (
    <Box
      title={translate("boxes.energy")}
      icon={<EnergyIcon className="text-content-victronGray w-7" />}
      linkedView={AppViews.BOX_ENERGY_OVERVIEW}
      headerActions={shoreIgnored ? <StatusPill label="Shore ignored · Solar Priority" variant="yellow" /> : undefined}
    >
      <div
        className="w-full h-full min-h-0 grid gap-0 pb-1"
        style={{
          gridTemplateColumns: "minmax(0,1fr) 3rem minmax(0,1.15fr) 3rem minmax(0,1fr)",
          gridTemplateRows: "minmax(0,1fr) 2.25rem minmax(0,1fr)",
        }}
      >
        {/* ---- top row: shore -> inverter/charger -> AC loads ---- */}
        <FlowCard
          icon={<ShorePowerIcon className={nodeIcon} />}
          title={translate("boxes.shorePower")}
          muted={!shoreConnected}
          className="col-start-1 row-start-1"
        >
          <div className="px-3 text-sm text-content-tertiary truncate">
            {shoreIgnored ? "Ignored · Solar Priority" : shoreConnected ? "Connected" : translate("common.unplugged")}
          </div>
          <FlowValue value={shoreConnected ? formatValue(shoreWatts, 0) : "--"} unit="W" muted={!shoreConnected} />
        </FlowCard>

        <div className="col-start-2 row-start-1">
          <FlowLink active={shoreConnected} />
        </div>

        <FlowCard
          icon={<InverterChargerIcon className={nodeIcon} />}
          title="Inverter / Charger"
          className="col-start-3 row-start-1 justify-center"
        >
          <div className="px-3 pb-2 text-xl leading-tight line-clamp-2">
            {translate(formatSystemStateFor(Number(systemState)))}
          </div>
        </FlowCard>

        <div className="col-start-4 row-start-1">
          <FlowLink active={!!acPower?.length} />
        </div>

        <FlowCard
          icon={<ACIcon className={nodeIcon} />}
          title={translate("boxes.acLoads")}
          className="col-start-5 row-start-1"
        >
          <FlowValue
            value={formatValue(phaseValueFor(acPhases, acCurrent, acPower, electricalPowerIndicator), 0)}
            unit="W"
          />
        </FlowCard>

        {/* ---- the vertical run between the inverter and the bank ---- */}
        <div className="col-start-3 row-start-2">
          <FlowLink orientation="vertical" />
        </div>

        {/* ---- bottom row: solar -> battery -> DC loads ---- */}
        <FlowCard
          icon={<SolarIcon className={nodeIcon} />}
          title={translate("boxes.solar")}
          muted={!solarWatts}
          className="col-start-1 row-start-3"
        >
          <FlowValue value={formatValue(solarWatts, 0)} unit="W" muted={!solarWatts} />
        </FlowCard>

        <div className="col-start-2 row-start-3">
          <FlowLink active={!!solarWatts} />
        </div>

        {/* The bank gets the Cerbo's filled band: state, time and the three
            pack figures on one strip, so it reads as the hub it is. */}
        <FlowCard
          icon={<BatteryIcon className={nodeIcon} />}
          title={translate("boxes.battery")}
          className="col-start-3 row-start-3"
        >
          <div className="flex items-baseline justify-between px-3 min-w-0">
            <span className="text-xl tabular-nums">
              {formatValue(bms.soc, 0)}
              <span className="text-base text-content-secondary ml-1">%</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-content-secondary tabular-nums shrink-0">
              <ThermometerIcon className="w-4 h-4" />
              {formatValue(bms.temperature, 1)} °C
            </span>
          </div>
          <div
            className="mt-auto px-3 py-1 min-w-0"
            style={{ backgroundColor: "rgba(var(--c-victron-blue-rgb), 0.28)" }}
          >
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <span className="text-sm truncate">{chargeStateLabel(bms.current)}</span>
              <span className="text-sm text-content-secondary tabular-nums shrink-0">
                {formatDuration(charging ? bms.timeToFull : bms.timeToGo)}
              </span>
            </div>
            <div className="text-sm tabular-nums text-content-secondary whitespace-nowrap">
              {formatValue(bms.voltage, 2)} V · {formatValue(bms.current, 1)} A · {formatValue(bms.power, 0)} W
            </div>
          </div>
        </FlowCard>

        <div className="col-start-4 row-start-3">
          <FlowLink active={!!dcLoads.power} />
        </div>

        <FlowCard
          icon={<DCIcon className={nodeIcon} />}
          title={translate("boxes.dcLoads")}
          className="col-start-5 row-start-3"
        >
          <FlowValue
            value={formatValue(dcValueFor(dcLoads.current, dcLoads.power, electricalPowerIndicator), 0)}
            unit="W"
          />
        </FlowCard>
      </div>
    </Box>
  )
}

export default observer(EnergyFlow)
