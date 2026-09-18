import React, { FC, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import {
  SwitchableOutputId,
  SwitchableOutputState,
  SwitchableOutputTree,
  useAppStore,
  useInputLimit,
  useInputLimitSelector,
  useInverterCharger,
  useSwitchingPane,
} from "@victronenergy/mfd-modules"
import { Modal } from "../../ui/Modal"
import Button from "../../ui/Button"
import SwitchableOutput from "../../ui/SwitchableOutput"
import { LimitAdjuster } from "../../ui/LimitAdjuster/LimitAdjuster"
import { Options } from "../InverterCharger/Modal/Options/Options"
import { CURRENT_LIMIT_STEP } from "../../../utils/constants/generic"
import {
  currentStepDecrementFor,
  currentStepIncrementFor,
  isCurrentStepDividable,
} from "../../../utils/helpers/current-limit-adjuster"
import { GREENLINE_INSTANCES, nativeSolarPriorityStatus, useSolarPriorityStatus } from "../../../modules/Greenline"

interface Props {
  onClose: () => void
}

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-0">
    <div className="text-sm text-content-secondary mb-2">{title}</div>
    {children}
  </div>
)

/**
 * The four controls that decide where the boat's power comes from, in one
 * place: inverter mode, the shore input limit, how hard the BMS is allowed to
 * charge, and whether Solar Priority is holding shore off.
 *
 * Mode and the shore limit are staged behind Apply — those two can trip the
 * boat's supply, and a mis-tap at a helm should not. The two switch outputs
 * write immediately, which is how every other switch in this app behaves.
 */
const PowerSettingsModal: FC<Props> = ({ onClose }) => {
  const vebus = GREENLINE_INSTANCES.vebus
  const { locked } = useAppStore()
  const { mode, modeIsAdjustable, updateMode } = useInverterCharger(vebus)
  const { currentLimitIsAdjustable } = useInputLimit(vebus, 1)
  const { currentLimit, currentLimitMax, updateLimit } = useInputLimitSelector(vebus, 1)
  const solarStatus = useSolarPriorityStatus(vebus, GREENLINE_INSTANCES.solarPrioritySwitch)
  const pane = useSwitchingPane(translate("switches.gxDeviceRelays"))

  // Mounted only while open, so both drafts seed from the device each time
  // the panel is raised and cancelling really cancels.
  const [draftMode, setDraftMode] = useState(Number(mode))
  const [draftLimit, setDraftLimit] = useState(Number(currentLimit))

  /**
   * Both driver services expose more than one output — dbus-solarpriority
   * carries the enable toggle and the PV capacity it sizes the probe against —
   * so take every output each device publishes rather than guessing which one
   * is "the" control. Devices are matched by pinned instance; output ids and
   * labels stay the drivers' business.
   */
  const outputsFor = useMemo(() => {
    const all: SwitchableOutputState[] = Object.values(pane.groups)
      .flat()
      .filter((item): item is SwitchableOutputState => item.kind === "switchableOutput")
    return (deviceId: number) =>
      all
        .filter((item) => Number(item.deviceId) === deviceId)
        .sort((a, b) => String(a.outputId).localeCompare(String(b.outputId)))
  }, [pane.groups])

  const chargingOutputs = [
    ...outputsFor(GREENLINE_INSTANCES.maxChargeSwitch),
    ...outputsFor(GREENLINE_INSTANCES.solarPrioritySwitch),
  ]

  const dirty = draftMode !== Number(mode) || draftLimit !== Number(currentLimit)

  const apply = () => {
    if (modeIsAdjustable === 1 && draftMode !== Number(mode)) updateMode(draftMode)
    if (currentLimitIsAdjustable && draftLimit !== Number(currentLimit)) updateLimit(draftLimit)
    onClose()
  }

  const renderOutput = (item: SwitchableOutputState) => (
    <SwitchableOutput
      className="w-full"
      key={`${item.deviceId}_${item.outputId}`}
      tree={item.tree as SwitchableOutputTree}
      type={item.type}
      deviceId={item.deviceId}
      outputId={item.outputId as SwitchableOutputId}
      parentDeviceName={item.parentDeviceName}
    />
  )

  return (
    <Modal.Frame open onClose={onClose} className="w-4/5 max-w-[62rem] max-h-[85%] flex flex-col">
      <Modal.Body className="flex-1 min-h-0 overflow-y-auto">
        <div className="text-xl mb-5">Power settings</div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="min-w-0">
            <Section title={translate("common.mode")}>
              {modeIsAdjustable === 1 ? (
                <Options mode={draftMode} onChange={setDraftMode} />
              ) : (
                <div className="text-sm text-content-tertiary">Mode is not adjustable on this device.</div>
              )}
            </Section>
            <div className="mt-6">
              <Section title="Shore input current limit">
                {currentLimitIsAdjustable ? (
                  <LimitAdjuster
                    value={draftLimit}
                    decreaseLimit={() =>
                      setDraftLimit((v) =>
                        v <= 0 ? 0 : isCurrentStepDividable(v) ? v - CURRENT_LIMIT_STEP : currentStepDecrementFor(v),
                      )
                    }
                    increaseLimit={() =>
                      setDraftLimit((v) =>
                        v >= (currentLimitMax ?? 100)
                          ? v
                          : isCurrentStepDividable(v)
                            ? v + CURRENT_LIMIT_STEP
                            : currentStepIncrementFor(v),
                      )
                    }
                  />
                ) : (
                  <div className="text-sm text-content-tertiary">Input limit is not adjustable.</div>
                )}
              </Section>
            </div>
          </div>

          <div className="min-w-0">
            <Section title="Charging &amp; solar priority">
              <dl className="text-sm mb-4 space-y-2">
                <div>
                  <dt className="text-content-secondary">Quattro solar &amp; wind priority</dt>
                  <dd>{nativeSolarPriorityStatus(solarStatus)}</dd>
                </div>
                <div>
                  <dt className="text-content-secondary">Boat Solar Priority controller</dt>
                  <dd>
                    {solarStatus.controllerState || "Unavailable"}
                    {solarStatus.oneWay ? ` · ${solarStatus.oneWay}` : ""}
                  </dd>
                  {solarStatus.controllerStatus && (
                    <dd className="text-content-tertiary">{solarStatus.controllerStatus}</dd>
                  )}
                </div>
              </dl>
              {chargingOutputs.length ? (
                chargingOutputs.map(renderOutput)
              ) : (
                <div className="text-sm text-content-tertiary">
                  The BMS and Solar Priority services are not on the bus.
                </div>
              )}
            </Section>
            <div className="text-sm text-content-tertiary mt-6">
              These two take effect as you set them. Mode and the shore limit wait for Apply.
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 p-3 w-full">
          <Button className="flex-1" size="md" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" size="md" disabled={!dirty || locked} onClick={apply}>
            Apply
          </Button>
        </div>
      </Modal.Footer>
    </Modal.Frame>
  )
}

export default observer(PowerSettingsModal)
