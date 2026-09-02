import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import MainLayout from "../ui/MainLayout"
import Box from "../ui/Box"
import StatusPill from "../ui/StatusPill"
import { ProgressCircle } from "../ui/ProgressCircle/ProgressCircle"
import GreenlineGauge from "../greenline/GreenlineGauge"
import ClutchIndicator from "../greenline/ClutchIndicator"
import { DASH, GreenlineRow } from "../greenline/GreenlineReadout"
import { driveToneFor, ENGINE_MODE_LABEL, engineModeFor, gearLabelFor, kw } from "../greenline/engine-mode"
import { GREENLINE_COLORS } from "../greenline/greenline-art"
import {
  chargeStateLabel,
  consumedAh,
  EDriveState,
  formatDuration,
  GAUGE_MAX,
  GREENLINE_INSTANCES,
  isDriveLive,
  recBmsAlarmLevel,
  useEDrive,
  useRecBms,
} from "../../modules/Greenline"
import { formatValue } from "../../utils/formatters/generic"
import { ISize } from "@m2Types/generic/size"

/** One motor column: the Greenline dial on top, the OPBOX field set below. */
const MotorColumn: FC<{ drive: EDriveState; side: "port" | "starboard"; title: string }> = ({ drive, side, title }) => {
  const live = isDriveLive(drive)
  const gear = gearLabelFor(drive)
  const tone = driveToneFor(drive)

  return (
    <Box
      title={title}
      headerActions={
        <StatusPill
          label={live ? `${ENGINE_MODE_LABEL[engineModeFor(drive)]} · ${gear}` : ENGINE_MODE_LABEL.off}
          variant={live && gear !== "NEUTRAL" && gear !== DASH ? "green" : "gray"}
        />
      }
    >
      <div className="w-full h-full min-h-0 flex flex-col">
        <div className="flex items-center justify-center gap-2 shrink-0">
          {side === "port" && (
            <ClutchIndicator
              side="port"
              direction={drive.direction}
              live={live}
              tone={tone}
              className="w-9 h-24 shrink-0"
            />
          )}
          <GreenlineGauge
            rpm={live ? drive.rpm : undefined}
            rpmMax={GAUGE_MAX.rpm}
            powerKw={live ? kw(drive.power) : undefined}
            powerMax={GAUGE_MAX.powerKw}
            live={live}
            tone={tone}
            className="max-w-[15rem] max-h-[15.5rem]"
          />
          {side === "starboard" && (
            <ClutchIndicator
              side="starboard"
              direction={drive.direction}
              live={live}
              tone={tone}
              className="w-9 h-24 shrink-0"
            />
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden mt-1">
          <GreenlineRow label="Motor speed" value={live ? drive.rpm : undefined} unit="rpm" live={live} />
          <GreenlineRow
            label="Motor voltage"
            value={live ? drive.voltage : undefined}
            unit="V"
            decimals={1}
            live={live}
          />
          <GreenlineRow
            label="Motor current"
            value={live ? drive.current : undefined}
            unit="A"
            decimals={1}
            live={live}
          />
          <GreenlineRow
            label="Motor power"
            value={live ? kw(drive.power) : undefined}
            unit="kW"
            decimals={2}
            live={live}
            tone="green"
          />
          <GreenlineRow
            label="Throttle"
            value={live ? drive.throttlePercent : undefined}
            unit="%"
            decimals={1}
            live={live}
          />
          <GreenlineRow label="Torque" value={live ? drive.torquePercent : undefined} unit="%" live={live} />
          <GreenlineRow
            label="Phase current"
            value={live ? drive.phaseCurrentPeak : undefined}
            unit="A"
            decimals={1}
            live={live}
          />
          <GreenlineRow
            label="MOSFET temp."
            value={live ? drive.mosfetTemperature : undefined}
            unit="°C"
            decimals={1}
            live={live}
          />
          <GreenlineRow
            label="HCU DC temp."
            value={live ? drive.controllerTemperature : undefined}
            unit="°C"
            decimals={1}
            live={live}
          />
          <GreenlineRow
            label="Motor temp."
            value={live ? drive.motorTemperature : undefined}
            unit="°C"
            decimals={1}
            live={live}
          />
        </div>
      </div>
    </Box>
  )
}

const BandCell: FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <div className="flex-1 flex flex-col items-center justify-center min-w-0">
    <div className="text-sm text-content-secondary">{label}</div>
    <div
      className="font-greenline text-md tabular-nums"
      style={{ color: muted ? GREENLINE_COLORS.gray : GREENLINE_COLORS.green }}
    >
      {value}
    </div>
  </div>
)

/**
 * The OPBOX extended screen, rebuilt on Cerbo data: port / BMS / starboard in
 * the reading order the boat's own display uses, with the range band along the
 * bottom. None of it depends on the Greenline HMI network being powered.
 */
const EDriveDetailView = () => {
  const port = useEDrive(GREENLINE_INSTANCES.drivePort)
  const starboard = useEDrive(GREENLINE_INSTANCES.driveStarboard)
  const bms = useRecBms(GREENLINE_INSTANCES.driveBattery)
  const [donutSize, setDonutSize] = useState<ISize>({ width: 0, height: 0 })

  const charging = (bms.current ?? 0) > 0.5
  const alarmLevel = recBmsAlarmLevel(bms)
  const leadFault = typeof bms.leadFault === "string" && bms.leadFault.length > 0

  const driveWatts = [port, starboard]
    .filter(isDriveLive)
    .reduce<number | undefined>((sum, d) => (typeof d.power === "number" ? (sum ?? 0) + d.power : sum), undefined)

  return (
    <MainLayout>
      <div className="w-full h-full min-h-0 grid gap-2 p-1 grid-rows-[minmax(0,1fr)_auto]">
        <div className="min-h-0 grid gap-2 grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,1fr)]">
          <MotorColumn drive={port} side="port" title={port.customName ?? "Port Motor"} />

          <Box
            title={bms.customName ?? "Drive Battery"}
            getBoxSizeCallback={setDonutSize}
            headerActions={
              <StatusPill
                label={alarmLevel >= 2 ? "ALARM" : leadFault ? "LEAD FAULT" : chargeStateLabel(bms.current)}
                variant={alarmLevel >= 2 ? "red" : leadFault ? "yellow" : charging ? "green" : "gray"}
              />
            }
          >
            <div className="w-full h-full min-h-0 flex flex-col">
              <div className="flex items-center justify-center gap-6 shrink-0 h-[13rem]">
                <div className="h-full w-[13rem] shrink-0">
                  <ProgressCircle percentage={bms.soc ?? 0} boxSize={donutSize}>
                    <div className="text-xl tabular-nums">
                      {formatValue(bms.soc, 0)}
                      <span className="text-base text-content-secondary ml-0.5">%</span>
                    </div>
                  </ProgressCircle>
                </div>
                <div className="leading-tight">
                  <div className="text-md tabular-nums">
                    {formatValue(bms.voltage, 2)}
                    <span className="text-base text-content-secondary ml-1">V</span>
                  </div>
                  <div className="text-md tabular-nums">
                    {formatValue(bms.current, 1)}
                    <span className="text-base text-content-secondary ml-1">A</span>
                  </div>
                  <div className="text-base text-content-secondary tabular-nums">
                    {formatValue((bms.power ?? 0) / 1000, 2)} kW
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 mt-1">
                <GreenlineRow label="State of health" value={bms.soh} unit="%" />
                <GreenlineRow label="Max cell temp." value={bms.maxCellTemperature} unit="°C" decimals={1} />
                <GreenlineRow
                  label="Cell min / max"
                  value={`${formatValue(bms.minCellVoltage, 3)} / ${formatValue(bms.maxCellVoltage, 3)}`}
                  unit="V"
                />
                <GreenlineRow label="Charge target" value={bms.targetChargeVoltage} unit="V" decimals={2} />
                <GreenlineRow label="Pack temperature" value={bms.temperature} unit="°C" decimals={1} />
                <GreenlineRow label="Consumed" value={consumedAh(bms.consumedAmphours)} unit="Ah" decimals={1} />
                {/* /Capacity is what is LEFT, not the pack size — the two rows
                    below sum to /InstalledCapacity. Labelling it "Capacity"
                    read as the pack being 860 Ah when it is 1440. */}
                <GreenlineRow
                  label="Remaining"
                  value={`${formatValue(bms.capacity, 0)} of ${formatValue(bms.installedCapacity, 0)}`}
                  unit="Ah"
                />
                <GreenlineRow
                  label="Solar lead"
                  value={typeof bms.solarLead === "number" ? bms.solarLead : undefined}
                  unit="V"
                  decimals={2}
                  tone="green"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {leadFault && <StatusPill label={`Lead fault: ${bms.leadFault}`} variant="yellow" />}
                  {!!bms.boostActive && <StatusPill label="Solar boost active" variant="green" />}
                  {!bms.boostActive && !!bms.boostWindowOpen && <StatusPill label="Boost window open" variant="gray" />}
                </div>
              </div>
            </div>
          </Box>

          <MotorColumn drive={starboard} side="starboard" title={starboard.customName ?? "Starboard Motor"} />
        </div>

        {/* Range band — the OPBOX bottom bar. The inactive time reads as an
            em-dash rather than vanishing, so the band never changes shape. */}
        <div className="flex items-stretch bg-surface-secondary rounded-md min-h-px-44 py-2 px-4">
          <BandCell label="Charge" value={`${formatValue(bms.soc, 0)} %`} />
          <div className="w-px bg-outline-secondary" />
          <BandCell label="Time to empty" value={formatDuration(bms.timeToGo)} muted={charging || !bms.timeToGo} />
          <div className="w-px bg-outline-secondary" />
          <BandCell label="Time to full" value={formatDuration(bms.timeToFull)} muted={!charging} />
          <div className="w-px bg-outline-secondary" />
          <BandCell
            label="Drive draw"
            value={driveWatts === undefined ? DASH : `${formatValue(driveWatts / 1000, 2)} kW`}
            muted={driveWatts === undefined}
          />
        </div>
      </div>
    </MainLayout>
  )
}

export default observer(EDriveDetailView)
