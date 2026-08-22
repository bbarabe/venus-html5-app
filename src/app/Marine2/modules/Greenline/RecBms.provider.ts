import { useMemo } from "react"
import { PortalId, useMqtt, useTopicsState } from "@victronenergy/mfd-modules"

export interface RecBmsState {
  connected?: number
  customName?: string
  soc?: number
  soh?: number
  voltage?: number
  current?: number
  power?: number
  temperature?: number
  timeToGo?: number
  timeToFull?: number
  capacity?: number
  installedCapacity?: number
  consumedAmphours?: number
  minCellVoltage?: number
  maxCellVoltage?: number
  maxCellTemperature?: number
  targetChargeVoltage?: number
  maxChargeVoltage?: number
  /** Solar Priority: the volts the BMS holds back so the MPPTs lead the charge. */
  solarLead?: number
  /** Non-empty string whenever the solar lead cannot be applied. */
  leadFault?: string
  boostActive?: number
  boostWindowOpen?: number
  boostStatus?: string
  errorCode?: number
  chargeCycles?: number
  maxChargeCurrent?: number
  maxDischargeCurrent?: number
  modulesOnline?: number
  cellsPerBattery?: number
  phase?: string
  eqStatus?: string
  minCellTemperature?: number
  alarmLowVoltage?: number
  alarmHighVoltage?: number
  alarmLowSoc?: number
  alarmHighTemperature?: number
  alarmLowTemperature?: number
  alarmCellImbalance?: number
  alarmInternalFailure?: number
  alarmHighChargeCurrent?: number
  alarmHighDischargeCurrent?: number
}

export const getRecBmsTopics = (portalId: PortalId, instance: number) => ({
  connected: `N/${portalId}/battery/${instance}/Connected`,
  customName: `N/${portalId}/battery/${instance}/CustomName`,
  soc: `N/${portalId}/battery/${instance}/Soc`,
  soh: `N/${portalId}/battery/${instance}/Soh`,
  voltage: `N/${portalId}/battery/${instance}/Dc/0/Voltage`,
  current: `N/${portalId}/battery/${instance}/Dc/0/Current`,
  power: `N/${portalId}/battery/${instance}/Dc/0/Power`,
  temperature: `N/${portalId}/battery/${instance}/Dc/0/Temperature`,
  timeToGo: `N/${portalId}/battery/${instance}/TimeToGo`,
  timeToFull: `N/${portalId}/battery/${instance}/RecBms/TimeToFull`,
  capacity: `N/${portalId}/battery/${instance}/Capacity`,
  installedCapacity: `N/${portalId}/battery/${instance}/InstalledCapacity`,
  consumedAmphours: `N/${portalId}/battery/${instance}/ConsumedAmphours`,
  minCellVoltage: `N/${portalId}/battery/${instance}/System/MinCellVoltage`,
  maxCellVoltage: `N/${portalId}/battery/${instance}/System/MaxCellVoltage`,
  maxCellTemperature: `N/${portalId}/battery/${instance}/System/MaxCellTemperature`,
  targetChargeVoltage: `N/${portalId}/battery/${instance}/RecBms/TargetChargeVoltage`,
  maxChargeVoltage: `N/${portalId}/battery/${instance}/Info/MaxChargeVoltage`,
  solarLead: `N/${portalId}/battery/${instance}/RecBms/SolarLead`,
  leadFault: `N/${portalId}/battery/${instance}/RecBms/LeadFault`,
  boostActive: `N/${portalId}/battery/${instance}/RecBms/SolarBoost/Active`,
  boostWindowOpen: `N/${portalId}/battery/${instance}/RecBms/SolarBoost/WindowOpen`,
  boostStatus: `N/${portalId}/battery/${instance}/RecBms/SolarBoost/Status`,
  errorCode: `N/${portalId}/battery/${instance}/ErrorCode`,
  chargeCycles: `N/${portalId}/battery/${instance}/History/ChargeCycles`,
  maxChargeCurrent: `N/${portalId}/battery/${instance}/Info/MaxChargeCurrent`,
  maxDischargeCurrent: `N/${portalId}/battery/${instance}/Info/MaxDischargeCurrent`,
  modulesOnline: `N/${portalId}/battery/${instance}/System/NrOfModulesOnline`,
  cellsPerBattery: `N/${portalId}/battery/${instance}/System/NrOfCellsPerBattery`,
  phase: `N/${portalId}/battery/${instance}/RecBms/Phase`,
  eqStatus: `N/${portalId}/battery/${instance}/RecBms/EqStatus`,
  minCellTemperature: `N/${portalId}/battery/${instance}/System/MinCellTemperature`,
  alarmLowVoltage: `N/${portalId}/battery/${instance}/Alarms/LowVoltage`,
  alarmHighVoltage: `N/${portalId}/battery/${instance}/Alarms/HighVoltage`,
  alarmLowSoc: `N/${portalId}/battery/${instance}/Alarms/LowSoc`,
  alarmHighTemperature: `N/${portalId}/battery/${instance}/Alarms/HighTemperature`,
  alarmLowTemperature: `N/${portalId}/battery/${instance}/Alarms/LowTemperature`,
  alarmCellImbalance: `N/${portalId}/battery/${instance}/Alarms/CellImbalance`,
  alarmInternalFailure: `N/${portalId}/battery/${instance}/Alarms/InternalFailure`,
  alarmHighChargeCurrent: `N/${portalId}/battery/${instance}/Alarms/HighChargeCurrent`,
  alarmHighDischargeCurrent: `N/${portalId}/battery/${instance}/Alarms/HighDischargeCurrent`,
})

/** The REC-BMS drive bank, by fixed device instance. */
export function useRecBms(instance: number): RecBmsState {
  const { portalId } = useMqtt()
  const topics = useMemo(() => getRecBmsTopics(portalId, instance), [portalId, instance])
  return useTopicsState<RecBmsState>(topics)
}

const ALARM_KEYS: Array<keyof RecBmsState> = [
  "alarmLowVoltage",
  "alarmHighVoltage",
  "alarmLowSoc",
  "alarmHighTemperature",
  "alarmLowTemperature",
  "alarmCellImbalance",
  "alarmInternalFailure",
  "alarmHighChargeCurrent",
  "alarmHighDischargeCurrent",
]

/** Highest active alarm level across the BMS: 0 none, 1 warning, 2 alarm. */
export const recBmsAlarmLevel = (bms: RecBmsState): number =>
  ALARM_KEYS.reduce((worst, key) => Math.max(worst, Number(bms[key]) || 0), 0)

/**
 * Cell spread in millivolts — the single most useful number for a LiFePO4
 * pack's health, and one the BMS does not publish ready-made.
 */
export const cellSpreadMv = (bms: RecBmsState) =>
  typeof bms.minCellVoltage === "number" && typeof bms.maxCellVoltage === "number"
    ? (bms.maxCellVoltage - bms.minCellVoltage) * 1000
    : undefined
