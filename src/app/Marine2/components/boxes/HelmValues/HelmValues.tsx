import React, { useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { translate } from "react-i18nify"
import Box from "../../ui/Box"
import GearIcon from "../../ui/GearIcon"
import TankValue from "./TankValue"
import EnvironmentValue from "./EnvironmentValue"
import HelmValuePicker from "./HelmValuePicker"
import TanksIcon from "../../../images/icons/tanks.svg"
import EnvironmentIcon from "../../../images/icons/environment.svg"
import { AppViews } from "../../../modules/AppViews"
import {
  EnvironmentValueRef,
  HelmValueRef,
  MAX_VALUES_PER_KIND,
  TankValueRef,
  helmValueKey,
  useHelmValueCatalog,
  useHelmValuesStore,
} from "../../../modules/HelmValues"

const HelmValueSlot = ({ valueRef, showMeasurement }: { valueRef: HelmValueRef; showMeasurement: boolean }) =>
  valueRef.kind === "tank" ? (
    <TankValue instance={valueRef.instance} />
  ) : (
    <EnvironmentValue
      instance={valueRef.instance}
      measurement={valueRef.measurement}
      showMeasurement={showMeasurement}
    />
  )

/**
 * Up to eight readings of the helm's own choosing, in two columns: tank
 * levels on the left, sensor readings on the right.
 *
 * Splitting by kind rather than flowing them together means each column has a
 * fixed job, so a glance goes to the right half of the panel before it reads
 * anything — and four rows is what a column holds at a size that still reads
 * at arm's length.
 *
 * Both sources are enumerated from the bus — every tank on `tank/+` and every
 * sensor on `temperature/+` — so what this panel can offer is decided by what
 * the GX is publishing, never by anything written down here. The choice
 * itself roams: it is kept on the GX by the camera relay, like the quick
 * switches and the theme, so every display shows the same picks and an MFD
 * reboot does not lose them.
 *
 * Slots are bound to device instances rather than to the enumeration, so a
 * sender that stops talking leaves an em-dash where its reading was and the
 * grid does not move.
 */
const HelmValues = () => {
  const store = useHelmValuesStore()
  const catalog = useHelmValueCatalog()
  const [pickerOpen, setPickerOpen] = useState(false)

  // Undefined means nobody has chosen yet, so the bus decides. An explicit
  // empty list is a choice and stays empty.
  const selection = store.selection ?? catalog.defaultSelection

  const sections = useMemo(() => {
    const tanks = selection.filter((ref): ref is TankValueRef => ref.kind === "tank")
    const environment = selection.filter((ref): ref is EnvironmentValueRef => ref.kind === "environment")

    return [
      { key: "tank", title: translate("boxes.tanks"), view: AppViews.BOX_TANKS, Icon: TanksIcon, refs: tanks },
      {
        key: "environment",
        title: translate("boxes.environment"),
        view: AppViews.BOX_ENVIRONMENT_OVERVIEW,
        Icon: EnvironmentIcon,
        refs: environment,
      },
    ].filter((section) => section.refs.length > 0)
  }, [selection])

  // One sensor can fill three slots — a Ruuvi reports temperature, humidity
  // and pressure on one service — and then its name is the same on all three.
  // Where that happens the cells say which reading they are.
  const refsPerInstance = useMemo(() => {
    const counts = new Map<number, number>()
    selection
      .filter((ref) => ref.kind === "environment")
      .forEach((ref) => counts.set(ref.instance, (counts.get(ref.instance) ?? 0) + 1))
    return counts
  }, [selection])

  // The panel names whatever it is currently showing, so it stays honest when
  // the helm pins sensors and no tanks.
  const title = sections.length ? sections.map((section) => section.title).join(" & ") : "Panel values"
  const HeaderIcon = sections.length ? sections[0].Icon : EnvironmentIcon

  // The columns carry no headings: the box title already names them, and
  // "Tanks & Environment" over a column marked "Tanks" reads as a stutter.
  // Which column is which is obvious from what is in it — bars on the left,
  // readings on the right — and the drill-through the headings used to carry
  // now rides on the box's own link arrow whenever there is a single
  // destination for it to mean.
  //
  // With one kind pinned there is no second column to fill, so its rows take
  // the whole width two abreast rather than leaving half the panel blank.
  const singleSection = sections.length === 1
  const columns = singleSection ? 2 : 1

  return (
    <Box
      title={title}
      icon={<HeaderIcon className="text-content-victronGray w-7" />}
      linkedView={singleSection ? sections[0].view : undefined}
      headerActions={
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Choose panel values"
          className="w-px-44 h-px-44 -mr-2 p-2 flex items-center justify-center cursor-pointer text-content-victronBlue"
        >
          <GearIcon className="w-6 h-6" />
        </button>
      }
    >
      <div
        className="w-full h-full min-h-0 grid gap-x-2 gap-y-1 pb-1"
        style={{ gridTemplateColumns: `repeat(${sections.length || 1}, minmax(0,1fr))` }}
      >
        {sections.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center px-4">
            <span className="w-full text-sm text-content-tertiary text-center">
              Nothing pinned — use the gear to choose up to {MAX_VALUES_PER_KIND} tank levels and {MAX_VALUES_PER_KIND}{" "}
              sensor readings.
            </span>
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.key}
              className="min-w-0 min-h-0 grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
                // Always the full four slots, filled or not: a column that is
                // only half chosen keeps its rows the same height as the one
                // beside it, and a reading that goes away leaves its place
                // rather than resizing everything around it.
                gridTemplateRows: `repeat(${Math.ceil(MAX_VALUES_PER_KIND / columns)}, minmax(0,1fr))`,
              }}
            >
              {section.refs.map((ref) => (
                <HelmValueSlot
                  key={helmValueKey(ref)}
                  valueRef={ref}
                  showMeasurement={(refsPerInstance.get(ref.instance) ?? 0) > 1}
                />
              ))}
            </div>
          ))
        )}
      </div>
      {pickerOpen ? (
        <HelmValuePicker
          onClose={() => setPickerOpen(false)}
          catalog={catalog}
          selection={selection}
          onSave={(refs) => store.setSelection(refs)}
        />
      ) : (
        <></>
      )}
    </Box>
  )
}

export default observer(HelmValues)
