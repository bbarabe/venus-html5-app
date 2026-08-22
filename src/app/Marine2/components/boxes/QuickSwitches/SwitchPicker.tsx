import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import classNames from "classnames"
import { SwitchingPaneItem, getSwitchingPaneItemNameForDisplay } from "@victronenergy/mfd-modules"
import { Modal } from "../../ui/Modal"
import Button from "../../ui/Button"
import { MAX_QUICK_SWITCHES, QuickSwitchRef, quickSwitchKey } from "../../../modules/QuickSwitches"

interface Props {
  onClose: () => void
  /** Every pinnable output on the boat, grouped as the Switching Pane groups them. */
  groups: Array<{ name: string; items: SwitchingPaneItem[] }>
  selection: QuickSwitchRef[]
  onSave: (refs: QuickSwitchRef[]) => void
}

const refFor = (item: SwitchingPaneItem): QuickSwitchRef => ({
  tree: item.tree,
  deviceId: String(item.deviceId),
  outputId: item.outputId,
})

const Checkbox: FC<{ checked: boolean; disabled: boolean }> = ({ checked, disabled }) => (
  <span
    className={classNames(
      "w-7 h-7 shrink-0 rounded-sm border-px-2 flex items-center justify-center",
      checked
        ? "border-content-victronBlue bg-surface-victronBlue"
        : disabled
          ? "border-content-victronGray50"
          : "border-content-victronGray",
    )}
  >
    {checked && (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-content-victronBlue" aria-hidden="true">
        <path d="M2 8.5 6 12.5 14 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )}
  </span>
)

/**
 * Pick which switches get a button on Home. Capped at four, and the cap is
 * shown rather than enforced silently — unchecked rows go quiet once the
 * fourth is chosen, so it is obvious why they stopped responding.
 */
const SwitchPicker: FC<Props> = ({ onClose, groups, selection, onSave }) => {
  // Mounted only while open, so this seeds fresh every time and cancelling
  // really cancels.
  const [draft, setDraft] = useState<QuickSwitchRef[]>(selection)

  const full = draft.length >= MAX_QUICK_SWITCHES

  const toggle = (item: SwitchingPaneItem) => {
    const ref = refFor(item)
    const key = quickSwitchKey(ref)
    const already = draft.some((r) => quickSwitchKey(r) === key)
    if (already) {
      setDraft(draft.filter((r) => quickSwitchKey(r) !== key))
    } else if (!full) {
      setDraft([...draft, ref])
    }
  }

  return (
    <Modal.Frame open onClose={onClose} className="w-2/3 max-w-[46rem] max-h-[80%] flex flex-col">
      <Modal.Body className="flex-1 min-h-0 overflow-y-auto">
        <div className="text-xl mb-1">Quick switches</div>
        <div className="text-sm text-content-secondary mb-4">
          {draft.length} of {MAX_QUICK_SWITCHES} chosen
        </div>
        {groups.map((group) => (
          <div key={group.name} className="mb-4">
            <div className="text-sm text-content-secondary mb-1">{group.name}</div>
            {group.items.map((item) => {
              const ref = refFor(item)
              const checked = draft.some((r) => quickSwitchKey(r) === quickSwitchKey(ref))
              const disabled = !checked && full
              return (
                <div
                  key={quickSwitchKey(ref)}
                  onClick={() => toggle(item)}
                  className={classNames(
                    "flex items-center gap-3 min-h-px-44 py-1 border-b border-outline-secondary last:border-b-0",
                    disabled ? "cursor-default text-content-tertiary" : "cursor-pointer",
                  )}
                >
                  <Checkbox checked={checked} disabled={disabled} />
                  <span className="truncate">{getSwitchingPaneItemNameForDisplay(item, item.parentDeviceName)}</span>
                </div>
              )
            })}
          </div>
        ))}
        {groups.length === 0 && <div className="text-content-secondary">No switches on the bus.</div>}
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 p-3">
          <Button className="flex-1" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            size="md"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            OK
          </Button>
        </div>
      </Modal.Footer>
    </Modal.Frame>
  )
}

export default observer(SwitchPicker)
