import React from "react"
import { observer } from "mobx-react-lite"
import Box from "../../ui/Box"
import StatusPill from "../../ui/StatusPill"
import DriveCluster from "../../greenline/DriveCluster"
import { AppViews } from "../../../modules/AppViews"
import { GREENLINE_INSTANCES, isDriveLive, useEDrive } from "../../../modules/Greenline"

/**
 * Home's propulsion panel: the Greenline drive cluster, tappable through to
 * the detail page. Hard-coded to the two pinned motordrive instances rather
 * than enumerating the bus, so the panel keeps its place on the screen while
 * the drives are asleep.
 */
const EDriveSummary = () => {
  const port = useEDrive(GREENLINE_INSTANCES.drivePort)
  const starboard = useEDrive(GREENLINE_INSTANCES.driveStarboard)
  const anyLive = isDriveLive(port) || isDriveLive(starboard)

  return (
    <Box
      title="E-Drive"
      linkedView={AppViews.EDRIVE}
      headerActions={<StatusPill label={anyLive ? "RUNNING" : "DRIVE OFF"} variant={anyLive ? "green" : "gray"} />}
    >
      <div className="w-full h-full min-h-0 pb-1">
        <DriveCluster port={port} starboard={starboard} />
      </div>
    </Box>
  )
}

export default observer(EDriveSummary)
