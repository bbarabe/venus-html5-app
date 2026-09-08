import { useEffect, useMemo } from "react"
import { PortalId, useMqtt, useTopicsState } from "@victronenergy/mfd-modules"

/** Venus /Motor/Direction enum, as published by dbus-edrive. */
export enum MotorDirection {
  NEUTRAL = 0,
  REVERSE = 1,
  FORWARD = 2,
}

export interface EDriveState {
  /** 0 while the drive is silent — dbus-edrive blanks every value after 6 s. */
  connected?: number
  customName?: string
  productName?: string
  rpm?: number
  direction?: number
  voltage?: number
  current?: number
  power?: number
  motorTemperature?: number
  controllerTemperature?: number
  coolantTemperature?: number
  /** The /EDrive/* paths only exist when publish_extra is on. */
  mosfetTemperature?: number
  throttlePercent?: number
  torquePercent?: number
  torqueNm?: number
  phaseCurrentPeak?: number
  phaseCurrentRms?: number
  mechanicalPower?: number
  running?: number
}

export const getEDriveTopics = (portalId: PortalId, instance: number) => ({
  connected: `N/${portalId}/motordrive/${instance}/Connected`,
  customName: `N/${portalId}/motordrive/${instance}/CustomName`,
  productName: `N/${portalId}/motordrive/${instance}/ProductName`,
  rpm: `N/${portalId}/motordrive/${instance}/Motor/RPM`,
  direction: `N/${portalId}/motordrive/${instance}/Motor/Direction`,
  voltage: `N/${portalId}/motordrive/${instance}/Dc/0/Voltage`,
  current: `N/${portalId}/motordrive/${instance}/Dc/0/Current`,
  power: `N/${portalId}/motordrive/${instance}/Dc/0/Power`,
  motorTemperature: `N/${portalId}/motordrive/${instance}/Motor/Temperature`,
  controllerTemperature: `N/${portalId}/motordrive/${instance}/Controller/Temperature`,
  coolantTemperature: `N/${portalId}/motordrive/${instance}/Coolant/Temperature`,
  mosfetTemperature: `N/${portalId}/motordrive/${instance}/EDrive/MosfetTemperature`,
  throttlePercent: `N/${portalId}/motordrive/${instance}/EDrive/ThrottlePercent`,
  torquePercent: `N/${portalId}/motordrive/${instance}/EDrive/TorquePercent`,
  torqueNm: `N/${portalId}/motordrive/${instance}/EDrive/TorqueNm`,
  phaseCurrentPeak: `N/${portalId}/motordrive/${instance}/EDrive/PhaseCurrentPeak`,
  phaseCurrentRms: `N/${portalId}/motordrive/${instance}/EDrive/PhaseCurrentRms`,
  mechanicalPower: `N/${portalId}/motordrive/${instance}/EDrive/MechanicalPower`,
  running: `N/${portalId}/motordrive/${instance}/EDrive/Running`,
})

/**
 * Subscribe to the motordrive class, which mfd-modules never does on its own.
 *
 * On connect the MQTT store subscribes to a fixed list of service classes
 * (settings, system, vebus, battery, tank, temperature, switch, ...) and
 * `useTopicsState` only reads the cache — it never subscribes. `motordrive` is
 * not on that list, so without this hook no drive topic ever arrives and every
 * drive reads DRIVE OFF whatever dbus-edrive publishes.
 *
 * The GX does not retain its values on the broker, and `/Connected` only
 * changes on a transition, so after subscribing we ask for a full republish:
 * a late subscriber would otherwise sit blank until the drive was switched off
 * and on again. The store clears its subscriptions on every disconnect, so the
 * effect is keyed on the connection state and re-subscribes after a reconnect.
 */
const useMotorDriveSubscription = () => {
  const mqtt = useMqtt()
  const { portalId, isConnected } = mqtt
  useEffect(() => {
    if (!portalId || !isConnected) return
    const topic = `N/${portalId}/motordrive/#`
    if (mqtt.topicsSubscribed.has(topic)) return
    mqtt.subscribeToTopic(topic)
    mqtt.sendFullKeepalive()
  }, [mqtt, portalId, isConnected])
}

/**
 * One Greenline e-drive, by fixed device instance.
 *
 * Every field is optional on purpose: the drives are silent whenever the
 * hybrid system is powered down, which is most of the time at the dock, and
 * the panels are required to hold their layout through that.
 */
export function useEDrive(instance: number): EDriveState {
  useMotorDriveSubscription()
  const { portalId } = useMqtt()
  const topics = useMemo(() => getEDriveTopics(portalId, instance), [portalId, instance])
  return useTopicsState<EDriveState>(topics)
}

/** True when the drive is publishing live values rather than blanks. */
export const isDriveLive = (drive: EDriveState) => drive.connected === 1
