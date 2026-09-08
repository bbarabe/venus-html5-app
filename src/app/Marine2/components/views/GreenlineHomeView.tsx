import React from "react"
import { observer } from "mobx-react-lite"
import MainLayout from "../ui/MainLayout"
import EDriveSummary from "../boxes/EDriveSummary"
import EnergyFlow from "../boxes/EnergyFlow"
import PowerBank from "../boxes/PowerBank"
import HelmValues from "../boxes/HelmValues"
import QuickSwitches from "../boxes/QuickSwitches"

/**
 * Home for this boat.
 *
 * Deliberately a fixed layout rather than RootView's paginated grid: RootView
 * has to cope with an unknown boat, this screen does not. Every zone gets a
 * permanent place so muscle memory works at the helm, and propulsion takes the
 * top left because on a hybrid boat underway it outranks everything else.
 *
 * Nothing on this page pages or scrolls — a helm display should never hide a
 * number behind a gesture.
 *
 * The 2x2 grid is unconditional. It used to fall back to one column below
 * Tailwind's `lg` (1400px), which is exactly what happens when the MFD opens
 * an autopilot pane beside the webview: the two extra rows then sized to
 * their content and the fractional rows holding E-Drive and Energy collapsed
 * to nothing. The page scales as a unit instead — see the viewport rules at
 * the end of global.css.
 */
const GreenlineHomeView = () => (
  <MainLayout>
    <div className="w-full h-full min-h-0 grid gap-2 p-1 grid-cols-[minmax(0,7fr)_minmax(0,13fr)] grid-rows-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <EDriveSummary />
      <EnergyFlow />
      {/* The pinned readings give up the bottom of their column to the
          pinned switches: six values need about two thirds of the height, and
          the switches want to be reachable without a modal. */}
      <div className="min-h-0 grid gap-2 grid-rows-[minmax(0,2fr)_minmax(0,1fr)]">
        <HelmValues />
        <QuickSwitches />
      </div>
      <PowerBank />
    </div>
  </MainLayout>
)

export default observer(GreenlineHomeView)
