import React, { FC, ReactNode, useState } from "react"
import { observer } from "mobx-react-lite"
import classNames from "classnames"
import { translate } from "react-i18nify"
import { useTank } from "@victronenergy/mfd-modules"
import { Modal } from "../../ui/Modal"
import Button from "../../ui/Button"
import Checkbox from "../../ui/Checkbox"
import { FluidIcon } from "../Tanks/Tank/FluidIcon/FluidIcon"
import { tankValueName } from "./TankValue"
import { environmentIcon, environmentMeasurementLabel } from "./environment-labels"
import {
  ENVIRONMENT_MEASUREMENTS,
  EnvironmentMeasurement,
  HelmValueCatalog,
  HelmValueKind,
  HelmValueRef,
  MAX_VALUES_PER_KIND,
  helmValueKey,
  measurementsPresent,
  useEnvironmentSensor,
} from "../../../modules/HelmValues"

interface Props {
  onClose: () => void
  catalog: HelmValueCatalog
  selection: HelmValueRef[]
  onSave: (refs: HelmValueRef[]) => void
}

interface RowProps {
  icon: ReactNode
  label: string
  checked: boolean
  disabled: boolean
  onClick: () => void
}

const PickerRow: FC<RowProps> = ({ icon, label, checked, disabled, onClick }) => (
  <div
    onClick={onClick}
    className={classNames(
      "flex items-center gap-3 min-h-px-44 py-1 border-b border-outline-secondary last:border-b-0",
      disabled ? "cursor-default text-content-tertiary" : "cursor-pointer",
    )}
  >
    <Checkbox checked={checked} disabled={disabled} />
    <span className="shrink-0 flex items-center">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
)

/**
 * The bus order the panel draws in, followed by anything pinned that the bus
 * is no longer offering. Listing the picker in a different order to the panel
 * makes the two hard to reconcile at a glance, so it does not.
 */
const inCatalogOrder = (catalogInstances: number[], pinnedInstances: number[]) => {
  const known = new Set(catalogInstances)
  const missing = Array.from(new Set(pinnedInstances.filter((instance) => !known.has(instance)))).sort((a, b) => a - b)
  return [...catalogInstances, ...missing]
}

/** One row per tank, named by whatever the tank calls itself. */
const TankRow = observer(
  ({
    instance,
    isChecked,
    full,
    toggle,
  }: {
    instance: number
    isChecked: (ref: HelmValueRef) => boolean
    full: boolean
    toggle: (ref: HelmValueRef) => void
  }) => {
    const { fluidType, customName } = useTank(instance)
    const fluidTypeNum = Number(fluidType)
    const ref: HelmValueRef = { kind: "tank", instance, measurement: "level" }
    const checked = isChecked(ref)

    return (
      <PickerRow
        icon={<FluidIcon fluid={fluidTypeNum} className="w-6 h-6" />}
        label={tankValueName(customName, Number.isFinite(fluidTypeNum) ? fluidTypeNum : undefined)}
        checked={checked}
        disabled={!checked && full}
        onClick={() => toggle(ref)}
      />
    )
  },
)

/**
 * A sensor contributes one row per measurement it is actually publishing —
 * so a bare thermometer offers one and a sensor that also reports humidity
 * and pressure offers three, without either being described anywhere.
 *
 * Anything already pinned is listed too, even if its sensor has since gone
 * quiet: a reading you cannot see is still a reading you must be able to
 * unpin.
 */
const SensorRows = observer(
  ({
    instance,
    isChecked,
    full,
    toggle,
    pinned,
  }: {
    instance: number
    isChecked: (ref: HelmValueRef) => boolean
    full: boolean
    toggle: (ref: HelmValueRef) => void
    pinned: EnvironmentMeasurement[]
  }) => {
    const sensor = useEnvironmentSensor(instance)
    const live = measurementsPresent(sensor)
    const measurements = ENVIRONMENT_MEASUREMENTS.filter((m) => live.includes(m) || pinned.includes(m))

    return (
      <>
        {measurements.map((measurement) => {
          const ref: HelmValueRef = { kind: "environment", instance, measurement }
          const checked = isChecked(ref)
          const name = sensor.customName
            ? `${sensor.customName} · ${environmentMeasurementLabel(measurement)}`
            : environmentMeasurementLabel(measurement)

          return (
            <PickerRow
              key={helmValueKey(ref)}
              icon={environmentIcon(measurement, "w-6 h-6 text-content-victronGray")}
              label={name}
              checked={checked}
              disabled={!checked && full}
              onClick={() => toggle(ref)}
            />
          )
        })}
      </>
    )
  },
)

/**
 * Pick which readings get a slot on Home.
 *
 * Each column is capped on its own, and each cap is shown rather than
 * enforced silently — unchecked rows in a full column go quiet, so it is
 * obvious why they stopped responding while the other column still answers.
 */
const HelmValuePicker: FC<Props> = ({ onClose, catalog, selection, onSave }) => {
  // Mounted only while open, so this seeds fresh every time and cancelling
  // really cancels.
  const [draft, setDraft] = useState<HelmValueRef[]>(selection)

  const countFor = (kind: HelmValueKind) => draft.filter((ref) => ref.kind === kind).length
  const isFull = (kind: HelmValueKind) => countFor(kind) >= MAX_VALUES_PER_KIND
  const isChecked = (ref: HelmValueRef) => draft.some((r) => helmValueKey(r) === helmValueKey(ref))

  const toggle = (ref: HelmValueRef) => {
    const key = helmValueKey(ref)
    if (isChecked(ref)) {
      setDraft(draft.filter((r) => helmValueKey(r) !== key))
    } else if (!isFull(ref.kind)) {
      setDraft([...draft, ref])
    }
  }

  // A device that has dropped off the bus keeps its row for as long as it is
  // pinned, so the choice stays reversible.
  const tankInstances = inCatalogOrder(
    catalog.tankInstances,
    draft.filter((r) => r.kind === "tank").map((r) => r.instance),
  )
  const sensorInstances = inCatalogOrder(
    catalog.sensorInstances,
    draft.filter((r) => r.kind === "environment").map((r) => r.instance),
  )
  const pinnedFor = (instance: number) =>
    draft
      .filter((r): r is Extract<HelmValueRef, { kind: "environment" }> => r.kind === "environment")
      .filter((r) => r.instance === instance)
      .map((r) => r.measurement)

  return (
    <Modal.Frame open onClose={onClose} className="w-2/3 max-w-[46rem] max-h-[80%] flex flex-col">
      <Modal.Body className="flex-1 min-h-0 overflow-y-auto">
        <div className="text-xl mb-4">Panel values</div>

        {tankInstances.length > 0 && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between text-sm text-content-secondary mb-1">
              <span>{translate("boxes.tanks")}</span>
              <span>
                {countFor("tank")} of {MAX_VALUES_PER_KIND}
              </span>
            </div>
            {tankInstances.map((instance) => (
              <TankRow key={instance} instance={instance} isChecked={isChecked} full={isFull("tank")} toggle={toggle} />
            ))}
          </div>
        )}

        {sensorInstances.length > 0 && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between text-sm text-content-secondary mb-1">
              <span>{translate("boxes.environment")}</span>
              <span>
                {countFor("environment")} of {MAX_VALUES_PER_KIND}
              </span>
            </div>
            {sensorInstances.map((instance) => (
              <SensorRows
                key={instance}
                instance={instance}
                isChecked={isChecked}
                full={isFull("environment")}
                toggle={toggle}
                pinned={pinnedFor(instance)}
              />
            ))}
          </div>
        )}

        {tankInstances.length === 0 && sensorInstances.length === 0 && (
          <div className="text-content-secondary">No tanks or sensors on the bus.</div>
        )}
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

export default observer(HelmValuePicker)
