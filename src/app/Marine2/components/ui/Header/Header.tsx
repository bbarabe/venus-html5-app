import React from "react"
import { observer } from "mobx-react-lite"

const Header = ({ title, right }: Props) => {
  return (
    <div className={"relative flex flex-row justify-between w-full items-center pb-1"}>
      <div className={"grow text-center text-sm md-m:text-base xl-m:text-md"}>{title}</div>
      {/* Greenline: an optional control pinned to the top right, over the title row */}
      {right && <div className={"absolute right-0 top-0"}>{right}</div>}
    </div>
  )
}

interface Props {
  title?: string
  right?: React.ReactNode
}

export default observer(Header)
