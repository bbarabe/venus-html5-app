import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import { useTank } from "@victronenergy/mfd-modules"
import ValueCell from "./ValueCell"
import ProgressBar from "../../ui/ProgressBar"
import { FluidIcon } from "../Tanks/Tank/FluidIcon/FluidIcon"
import { ValueWithPercentage } from "../Tanks/Tank/ValueWithPercentage/ValueWithPercentage"
import { FLUID_TRANSLATIONS } from "../../../utils/constants/devices/tanks"
import { formatLevelFor } from "../../../utils/formatters/devices/tanks/format-level-for"

/**
 * The name to print for a tank: whatever it was named on the GX, else what it
 * says it holds, else just "tank". Every step of that comes off the bus.
 */
export const tankValueName = (customName?: string, fluidType?: number) =>
  customName || (fluidType !== undefined ? FLUID_TRANSLATIONS[fluidType] : undefined) || translate("boxes.tanks")

/**
 * A tank level.
 *
 * Bound to the instance alone, so the cell holds its place — and its label —
 * whether or not the sender is still talking. A tank that goes quiet reads as
 * an em-dash over an empty bar; it does not disappear and take the layout
 * with it.
 */
const TankValue: FC<{ instance: number }> = ({ instance }) => {
  const { capacity, fluidType, level, customName } = useTank(instance)
  const fluidTypeNum = Number(fluidType)

  return (
    <ValueCell
      icon={<FluidIcon fluid={fluidTypeNum} className="w-5 h-5" />}
      name={tankValueName(customName, Number.isFinite(fluidTypeNum) ? fluidTypeNum : undefined)}
      bar={<ProgressBar percentage={level === undefined ? 0 : formatLevelFor(level)} type={fluidTypeNum} />}
      reading={
        level === undefined ? (
          // Capacity without a level is the stock "auxiliary tank" case: the
          // sender reports a size but never a reading.
          <span className="text-content-tertiary">{capacity === undefined ? "—" : "-- %"}</span>
        ) : (
          <ValueWithPercentage fluid={fluidTypeNum} level={level} className="text-base" />
        )
      }
    />
  )
}

export default observer(TankValue)
