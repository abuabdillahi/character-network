"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

// Extend D3's SimulationNodeDatum to include our custom properties
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string
  name?: string
  group?: number
  value?: number
  [key: string]: unknown // More type-safe than any
}

// Types for the component props
export interface Node {
  id: string
  name?: string
  group?: number
  value?: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  [key: string]: unknown // More type-safe than any
}

export interface Link {
  source: string | Node
  target: string | Node
  value?: number
  [key: string]: unknown // More type-safe than any
}

// Extend D3's SimulationLinkDatum to include our custom properties
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  value?: number
  [key: string]: unknown // More type-safe than any
}

export interface NetworkGraphProps {
  // Data
  nodes: Node[]
  links: Link[]

  // Appearance
  width?: number | string // Can be a fixed number or percentage/auto
  height?: number | string // Can be a fixed number or percentage/auto
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
  width = "100%",
  height = "100%",
  nodeRadius = (node: Node): number => Math.sqrt(node.value || 10) + 5,
  nodeColor = (node: Node): string => {
    const colors = ["#4361ee", "#3a0ca3", "#7209b7", "#f72585", "#4cc9f0"]
    return node.group !== undefined ? colors[node.group % colors.length] : "#4361ee"
  },
  linkColor = "#999",
  linkWidth = (link: Link): number => Math.sqrt(link.value || 1) * 1.5,

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
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null)

  // Handle node hover internally and propagate to parent if callback provided
  const handleNodeHover = (node: Node | null): void => {
    setHoveredNode(node)
    if (onNodeHover) {
      onNodeHover(node)
    }
  }

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = (): void => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect()

        // Only update if dimensions have actually changed
        if (containerWidth !== dimensions.width || containerHeight !== dimensions.height) {
          setDimensions({
            width: containerWidth,
            height: containerHeight,
          })
        }
      }
    }

    // Initial update
    updateDimensions()

    // Set up ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [dimensions.width, dimensions.height])

  // D3 force simulation
  useEffect(() => {
    if (!svgRef.current || !nodes.length || dimensions.width === 0 || dimensions.height === 0) return

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)

    // Create a deep copy of nodes to avoid mutating props
    const simulationNodes: SimulationNode[] = nodes.map((node) => ({ ...node }))

    // Create a map of node IDs to node objects
    const nodeMap = new Map<string, SimulationNode>()
    simulationNodes.forEach((node) => {
      nodeMap.set(node.id, node)
    })

    // Define the type for our link mapping function's return type
    type MappedLink = SimulationLink | null

    // Filter and convert links to the format D3 expects
    // Only include links where both source and target nodes exist
    const simulationLinks: SimulationLink[] = links
      .map<MappedLink>((link) => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id
        const targetId = typeof link.target === "string" ? link.target : link.target.id

        const sourceNode = nodeMap.get(sourceId)
        const targetNode = nodeMap.get(targetId)

        if (!sourceNode || !targetNode) {
          console.warn(`Link references non-existent node: ${sourceId} -> ${targetId}`)
          return null
        }

        return {
          ...link,
          source: sourceNode,
          target: targetNode,
        }
      })
      .filter((link): link is SimulationLink => link !== null)

    // Create a simulation with several forces
    const simulation = d3
      .forceSimulation<SimulationNode>()
      .nodes(simulationNodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(simulationLinks)
          .id((d) => d.id)
          .strength(linkStrength),
      )
      .force("charge", d3.forceManyBody<SimulationNode>().strength(nodeCharge * 10))
      .force("center", d3.forceCenter<SimulationNode>(dimensions.width / 2, dimensions.height / 2))
      .force("x", d3.forceX<SimulationNode>(dimensions.width / 2).strength(0.1))
      .force("y", d3.forceY<SimulationNode>(dimensions.height / 2).strength(0.1))

    // Store simulation reference for cleanup and updates
    simulationRef.current = simulation

    // Add zoom functionality if enabled
    if (enableZoom) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr("transform", event.transform.toString())
        })

      svg.call(zoom)
    }

    // Create a group for the graph elements
    const g = svg.append<SVGGElement>("g")

    // Add links
    const link = g
      .append("g")
      .attr("stroke", typeof linkColor === "function" ? null : linkColor)
      .attr("stroke-opacity", 0.6)
      .selectAll<SVGLineElement, SimulationLink>("line")
      .data(simulationLinks)
      .join("line")
      .attr("stroke-width", (d) => {
        const linkData = {
          ...d,
          source: typeof d.source === "object" ? d.source.id : d.source,
          target: typeof d.target === "object" ? d.target.id : d.target,
        } as Link
        return typeof linkWidth === "function" ? linkWidth(linkData) : linkWidth
      })

    if (typeof linkColor === "function") {
      link.attr("stroke", (d) => {
        const linkData = {
          ...d,
          source: typeof d.source === "object" ? d.source.id : d.source,
          target: typeof d.target === "object" ? d.target.id : d.target,
        } as Link
        return linkColor(linkData)
      })
    }

    // Add nodes
    const node = g
      .append("g")
      .selectAll<SVGCircleElement, SimulationNode>("circle")
      .data(simulationNodes)
      .join("circle")
      .attr("r", (d) => (typeof nodeRadius === "function" ? nodeRadius(d) : nodeRadius))
      .attr("fill", (d) => (typeof nodeColor === "function" ? nodeColor(d) : nodeColor))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)

    // Add drag behavior if enabled
    if (enableDrag) {
      const drag = d3
        .drag<SVGCircleElement, SimulationNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)

      node.call(drag)
    }

    // Add node labels if enabled
    if (showLabels) {
      const labels = g
        .append("g")
        .selectAll<SVGTextElement, SimulationNode>("text")
        .data(simulationNodes)
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
          .attr("x1", (d) => (d.source as SimulationNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimulationNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimulationNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimulationNode).y ?? 0)

        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0)

        labels.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0)
      })
    } else {
      // Update node and link positions on simulation tick (without labels)
      simulation.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as SimulationNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimulationNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimulationNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimulationNode).y ?? 0)

        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0)
      })
    }

    // Add event handlers
    node
      .on("mouseover", (event: MouseEvent, d: SimulationNode) => {
        handleNodeHover(d)

        // Highlight the node
        d3.select<SVGCircleElement, SimulationNode>(event.currentTarget as SVGCircleElement)
          .attr("stroke", "#ff6b6b")
          .attr("stroke-width", 2)

        // Highlight connected links
        link
          .attr("stroke", (l) => {
            const sourceId = (l.source as SimulationNode).id
            const targetId = (l.target as SimulationNode).id

            if (sourceId === d.id || targetId === d.id) {
              return "#ff6b6b"
            }

            const linkData = { ...l, source: sourceId, target: targetId } as Link
            return typeof linkColor === "function" ? linkColor(linkData) : linkColor
          })
          .attr("stroke-width", (l) => {
            const sourceId = (l.source as SimulationNode).id
            const targetId = (l.target as SimulationNode).id

            if (sourceId === d.id || targetId === d.id) {
              return 3
            }

            const linkData = { ...l, source: sourceId, target: targetId } as Link
            return typeof linkWidth === "function" ? linkWidth(linkData) : linkWidth
          })
      })
      .on("mouseout", (event: MouseEvent) => {
        handleNodeHover(null)

        // Reset node style
        d3.select<SVGCircleElement, SimulationNode>(event.currentTarget as SVGCircleElement)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)

        // Reset link styles
        link
          .attr("stroke", (d) => {
            const linkData = {
              ...d,
              source: (d.source as SimulationNode).id,
              target: (d.target as SimulationNode).id,
            } as Link
            return typeof linkColor === "function" ? linkColor(linkData) : linkColor
          })
          .attr("stroke-width", (d) => {
            const linkData = {
              ...d,
              source: (d.source as SimulationNode).id,
              target: (d.target as SimulationNode).id,
            } as Link
            return typeof linkWidth === "function" ? linkWidth(linkData) : linkWidth
          })
      })

    if (onNodeClick) {
      node.on("click", (event: MouseEvent, d: SimulationNode) => onNodeClick(d))
    }

    // Drag functions
    function dragstarted(
      event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>,
      d: SimulationNode,
    ): void {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode): void {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(
      event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>,
      d: SimulationNode,
    ): void {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Update simulation when parameters change
    const linkForce = simulation.force("link") as d3.ForceLink<SimulationNode, SimulationLink>
    if (linkForce) linkForce.strength(linkStrength)

    const chargeForce = simulation.force("charge") as d3.ForceManyBody<SimulationNode>
    if (chargeForce) chargeForce.strength(nodeCharge * 10)

    simulation.alpha(1).restart()

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
    }
  }, [
    nodes,
    links,
    dimensions.width,
    dimensions.height,
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

  // Update center forces when dimensions change
  useEffect(() => {
    if (!simulationRef.current || dimensions.width === 0 || dimensions.height === 0) return

    // Update center forces
    simulationRef.current
      .force("center", d3.forceCenter<SimulationNode>(dimensions.width / 2, dimensions.height / 2))
      .force("x", d3.forceX<SimulationNode>(dimensions.width / 2).strength(0.1))
      .force("y", d3.forceY<SimulationNode>(dimensions.height / 2).strength(0.1))
      .alpha(0.3)
      .restart()
  }, [dimensions.width, dimensions.height])

  // Update label visibility when showLabels changes
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll("text")
      .style("opacity", showLabels ? 0.7 : 0)
  }, [showLabels])

  // Determine container style based on width and height props
  const containerStyle: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    position: "relative",
  }

  return (
    <div ref={containerRef} style={containerStyle} className="network-graph-container">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="network-graph"
        style={{ display: "block" }}
      />
    </div>
  )
}
