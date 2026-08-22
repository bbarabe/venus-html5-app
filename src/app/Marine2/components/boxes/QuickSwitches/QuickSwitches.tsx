import React, { useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import {
  SwitchableOutputId,
  SwitchableOutputTree,
  SwitchingPaneItem,
  useAppStore,
  useSwitchingPane,
} from "@victronenergy/mfd-modules"
import { SWITCHABLE_OUTPUT_TYPE } from "@victronenergy/mfd-modules/dist/src/utils/constants"
import Box from "../../ui/Box"
import GearIcon from "../../ui/GearIcon"
import QuickButton from "./QuickButton"
import SwitchPicker from "./SwitchPicker"
import { MAX_QUICK_SWITCHES, quickSwitchKey, useQuickSwitchesStore } from "../../../modules/QuickSwitches"

/**
 * Only outputs with an honest on/off can be a one-tap button. Momentary
 * switches need press-and-hold semantics and the setpoint types have no "on",
 * so they stay in the Switching Pane where their real control lives.
 */
const PINNABLE_TYPES: number[] = [SWITCHABLE_OUTPUT_TYPE.TOGGLE_SWITCH, SWITCHABLE_OUTPUT_TYPE.DIMMABLE]

const isPinnable = (item: SwitchingPaneItem): boolean =>
  item.kind === "switchableOutput" && PINNABLE_TYPES.includes(item.type)

/**
 * Up to four switches pinned to Home.
 *
 * The full Switching Pane is always one tap away in the footer; this is for the
 * handful you reach for underway without wanting a modal over the screen.
 */
const QuickSwitches = () => {
  const pane = useSwitchingPane(translate("switches.gxDeviceRelays"))
  const { locked } = useAppStore()
  const quick = useQuickSwitchesStore()
  const [pickerOpen, setPickerOpen] = useState(false)

  const groups = useMemo(
    () =>
      Object.entries(pane.groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, items]) => ({ name, items: items.filter(isPinnable) }))
        .filter((g) => g.items.length > 0),
    [pane.groups],
  )

  // Resolve the stored picks against what is actually on the bus right now, so
  // a switch that has gone away leaves a gap rather than a broken button.
  const pinned = useMemo(() => {
    const byKey = new Map<string, SwitchingPaneItem>()
    groups.forEach((g) =>
      g.items.forEach((item) =>
        byKey.set(quickSwitchKey({ tree: item.tree, deviceId: String(item.deviceId), outputId: item.outputId }), item),
      ),
    )
    return quick.selection.map((ref) => byKey.get(quickSwitchKey(ref))).filter(Boolean) as SwitchingPaneItem[]
  }, [groups, quick.selection])

  return (
    <Box
      title="Quick Switches"
      headerActions={
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Choose quick switches"
          className="w-px-44 h-px-44 -mr-2 p-2 flex items-center justify-center cursor-pointer text-content-victronBlue"
        >
          <GearIcon className="w-6 h-6" />
        </button>
      }
    >
      <div className="w-full h-full min-h-0 pb-1">
        {pinned.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center px-4">
            <span className="w-full text-sm text-content-tertiary text-center">
              No switches pinned — use the gear to choose up to {MAX_QUICK_SWITCHES}.
            </span>
          </div>
        ) : (
          <div
            className="w-full h-full min-h-0 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(pinned.length, 1)}, minmax(0,1fr))` }}
          >
            {pinned.map((item) => (
              <QuickButton
                key={quickSwitchKey({ tree: item.tree, deviceId: String(item.deviceId), outputId: item.outputId })}
                tree={item.tree as SwitchableOutputTree}
                deviceId={item.deviceId}
                outputId={item.outputId as SwitchableOutputId}
                locked={locked}
              />
            ))}
          </div>
        )}
      </div>
      {pickerOpen ? (
        <SwitchPicker
          onClose={() => setPickerOpen(false)}
          groups={groups}
          selection={quick.selection}
          onSave={(refs) => quick.setSelection(refs)}
        />
      ) : (
        <></>
      )}
    </Box>
  )
}

export default observer(QuickSwitches)
