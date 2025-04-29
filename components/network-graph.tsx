"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

// Types for the component props
export interface Node {
  id: string
  name?: string
  group?: number
  value?: number
  [key: string]: any // Allow for additional properties
}

export interface Link {
  source: string
  target: string
  value?: number
  [key: string]: any // Allow for additional properties
}

export interface NetworkGraphProps {
  // Data
  nodes: Node[]
  links: Link[]

  // Appearance
  width?: number
  height?: number
  nodeRadius?: number | ((node: Node) => number)
  nodeColor?: string | ((node: Node) => string)
  linkColor?: string | ((link: Link) => string)
  linkWidth?: number | ((link: Link) => number)

  // Physics
  linkStrength?: number
  nodeCharge?: number

  // Features
  showLabels?: boolean
  enableZoom?: boolean
  enableDrag?: boolean

  // Events
  onNodeClick?: (node: Node) => void
  onNodeHover?: (node: Node | null) => void
}

export default function NetworkGraph({
  // Data
  nodes,
  links,

  // Appearance
  width = 800,
  height = 600,
  nodeRadius = (node) => Math.sqrt(node.value || 10) + 5,
  nodeColor = (node) => {
    const colors = ["#4361ee", "#3a0ca3", "#7209b7", "#f72585", "#4cc9f0"]
    return node.group !== undefined ? colors[node.group % colors.length] : "#4361ee"
  },
  linkColor = "#999",
  linkWidth = (link) => Math.sqrt(link.value || 1) * 1.5,

  // Physics
  linkStrength = 0.3,
  nodeCharge = -30,

  // Features
  showLabels = true,
  enableZoom = true,
  enableDrag = true,

  // Events
  onNodeClick,
  onNodeHover,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)

  // Handle node hover internally and propagate to parent if callback provided
  const handleNodeHover = (node: Node | null) => {
    setHoveredNode(node)
    if (onNodeHover) {
      onNodeHover(node)
    }
  }

  // Update dimensions if props change
  useEffect(() => {
    setDimensions({ width, height })
  }, [width, height])

  // D3 force simulation
  useEffect(() => {
    if (!svgRef.current || !nodes.length) return

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)

    // Create a simulation with several forces
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .strength(linkStrength),
      )
      .force("charge", d3.forceManyBody().strength(nodeCharge * 10))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("x", d3.forceX(dimensions.width / 2).strength(0.1))
      .force("y", d3.forceY(dimensions.height / 2).strength(0.1))

    // Add zoom functionality if enabled
    if (enableZoom) {
      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform)
        })

      svg.call(zoom as any)
    }

    // Create a group for the graph elements
    const g = svg.append("g")

    // Add links
    const link = g
      .append("g")
      .attr("stroke", typeof linkColor === "function" ? null : linkColor)
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => (typeof linkWidth === "function" ? linkWidth(d) : linkWidth))

    if (typeof linkColor === "function") {
      link.attr("stroke", linkColor)
    }

    // Add nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => (typeof nodeRadius === "function" ? nodeRadius(d) : nodeRadius))
      .attr("fill", (d) => (typeof nodeColor === "function" ? nodeColor(d) : nodeColor))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)

    // Add drag behavior if enabled
    if (enableDrag) {
      node.call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended) as any)
    }

    // Add node labels if enabled
    if (showLabels) {
      const labels = g
        .append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text((d) => d.name || d.id)
        .attr("font-size", 10)
        .attr("dx", 12)
        .attr("dy", 4)
        .style("pointer-events", "none")
        .style("opacity", 0.7)

      // Update label positions on simulation tick
      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y)

        node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)

        labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y)
      })
    } else {
      // Update node and link positions on simulation tick (without labels)
      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y)

        node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)
      })
    }

    // Add event handlers
    node
      .on("mouseover", (event, d) => {
        handleNodeHover(d as Node)

        // Highlight the node
        d3.select(event.currentTarget).attr("stroke", "#ff6b6b").attr("stroke-width", 2)

        // Highlight connected links
        link
          .attr("stroke", (l: any) =>
            l.source.id === d.id || l.target.id === d.id
              ? "#ff6b6b"
              : typeof linkColor === "function"
                ? linkColor(l)
                : linkColor,
          )
          .attr("stroke-width", (l: any) =>
            l.source.id === d.id || l.target.id === d.id
              ? 3
              : typeof linkWidth === "function"
                ? linkWidth(l)
                : linkWidth,
          )
      })
      .on("mouseout", (event) => {
        handleNodeHover(null)

        // Reset node style
        d3.select(event.currentTarget).attr("stroke", "#fff").attr("stroke-width", 1.5)

        // Reset link styles
        link
          .attr("stroke", typeof linkColor === "function" ? (d: any) => linkColor(d) : linkColor)
          .attr("stroke-width", (d: any) => (typeof linkWidth === "function" ? linkWidth(d) : linkWidth))
      })

    if (onNodeClick) {
      node.on("click", (_, d) => onNodeClick(d as Node))
    }

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Update simulation when parameters change
    simulation.force("charge")?.strength(nodeCharge * 10)
    simulation.force("link")?.strength(linkStrength)
    simulation.alpha(1).restart()

    return () => {
      simulation.stop()
    }
  }, [
    nodes,
    links,
    dimensions,
    linkStrength,
    nodeCharge,
    showLabels,
    nodeRadius,
    nodeColor,
    linkColor,
    linkWidth,
    enableZoom,
    enableDrag,
    onNodeClick,
    onNodeHover,
  ])

  return <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="network-graph" />
}
