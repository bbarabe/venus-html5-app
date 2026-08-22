import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import classNames from "classnames"
import {
  getSwitchingPaneItemNameForDisplay,
  SwitchableOutputId,
  SwitchableOutputTree,
  SwitchingDeviceInstanceId,
  useSwitchableOutput,
} from "@victronenergy/mfd-modules"
import { isSwitchableOutputDisabled } from "../../ui/SwitchableOutput/statusHelper"

interface Props {
  tree: SwitchableOutputTree
  deviceId: SwitchingDeviceInstanceId
  outputId: SwitchableOutputId
  /** Screen lock from the settings menu. */
  locked?: boolean
}

/**
 * One pinned switch as a single large target: name, state word, and the whole
 * tile is the tap area. Dimmables toggle their output here; their level still
 * lives in the Switching Pane, which is one tap away.
 */
const QuickButton: FC<Props> = ({ tree, deviceId, outputId, locked }) => {
  const output = useSwitchableOutput(tree, deviceId, outputId)
  const name = getSwitchingPaneItemNameForDisplay(output, output.parentDeviceName)
  const on = output.state === 1
  const disabled = locked || isSwitchableOutputDisabled(output.status)

  return (
    <button
      onClick={disabled ? undefined : () => output.updateState(on ? 0 : 1)}
      disabled={disabled}
      className={classNames(
        "min-w-0 h-full rounded-md border-px-2 px-2 py-1 flex flex-col items-center justify-center gap-1",
        disabled
          ? "border-content-victronGray50 text-content-tertiary"
          : on
            ? "border-content-victronBlue bg-surface-victronBlue text-content-primary cursor-pointer"
            : "border-content-victronGray text-content-secondary cursor-pointer",
      )}
    >
      <span className="text-sm leading-tight text-center line-clamp-2 min-w-0">{name}</span>
      <span className={classNames("text-xs", on ? "text-content-primary" : "text-content-tertiary")}>
        {on ? "ON" : "OFF"}
      </span>
    </button>
  )
}

export default observer(QuickButton)
