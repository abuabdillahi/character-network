"use client"

import NetworkGraph from "../components/network-graph"

// Minimal example data
const nodes = [
  { id: "1", name: "Node 1", group: 0 },
  { id: "2", name: "Node 2", group: 1 },
  { id: "3", name: "Node 3", group: 1 },
  { id: "4", name: "Node 4", group: 2 },
  { id: "5", name: "Node 5", group: 2 },
]

const links = [
  { source: "1", target: "2" },
  { source: "1", target: "3" },
  { source: "2", target: "3" },
  { source: "3", target: "4" },
  { source: "4", target: "5" },
  { source: "5", target: "1" },
]

export default function MinimalExample() {
  return (
    <div className="w-full h-[400px]">
      <NetworkGraph nodes={nodes} links={links} width={600} height={400} />
    </div>
  )
}
