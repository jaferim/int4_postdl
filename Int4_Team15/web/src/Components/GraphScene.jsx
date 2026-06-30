// src/Canvas.jsx
import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import {
  OrbitControls,
  Environment,
  Segments,
  Segment,
} from "@react-three/drei";
import * as THREE from "three";
import * as d3 from "d3-force";
import gsap from "gsap";
// Perf is the front-end team's main-canvas performance monitor (detail-animations branch). Kept off by default so the debug HUD doesn't ship to the demo — flip this import and its <Perf/> usage below back on while profiling:-
// import { Perf } from "r3f-perf";
import CanvasNode from "./CanvasNode.jsx";
import { useThemeVar } from "../lib/themeParser.js";
import { SharedMaterialsProvider } from "./SharedMaterialsProvider.jsx";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { useGraph } from "../lib/load.js";

// Remembers the home canvas's settled node positions across navigation. The home Canvas unmounts when you open a detail page and remounts on return, which otherwise rebuilds the d3 layout from scratch. So any untangling the visitor did is lost. We stash positions on unmount and restore them on the next mount (only when the centred board still matches), so the canvas comes back exactly as they left it instead of re-running the spread. In-memory only: a fresh reload starts clean. Scoped to home; detail views always lay out fresh.
let homeLayoutCache = null;

const isShopContainsLink = (link) =>
  link.relationType === "contains" &&
  (link.source?.type === "shop" ||
    link.target?.type === "shop" ||
    String(link.source).startsWith("shop-") ||
    String(link.target).startsWith("shop-"));

const linkPair = (link) => new Set([link.source?.type, link.target?.type]);

/*** The "big circle" node types: a moodboard on the home canvas, or the shop / curator a detail page is built around. They share the strong-repulsion and wide-collision treatment so these large circles never overlap one another. ***/
const isCentral = (node) =>
  node.type === "moodboard" ||
  node.type === "shop" ||
  node.type === "curator";

const isMoodboardItemLink = (link) =>
  link.relationType === "contains" &&
  linkPair(link).has("moodboard") &&
  linkPair(link).has("item");

const isVibeMoodboardLink = (link) =>
  link.relationType === "contains" &&
  linkPair(link).has("vibe") &&
  linkPair(link).has("moodboard");

const getLinkDistance = (link, useShopLinkPhysics) => {
  if (useShopLinkPhysics && isShopContainsLink(link)) return 400;
  if (isMoodboardItemLink(link)) return 300;
  if (isVibeMoodboardLink(link)) return 500;
  return link.relationType === "contains" ? 300 : 350;
};

const getLinkStrength = (link, useShopLinkPhysics) => {
  if (useShopLinkPhysics && isShopContainsLink(link)) return 0.8;
  if (isMoodboardItemLink(link)) return 0.8;
  if (isVibeMoodboardLink(link)) return 0.8;
  return link.relationType === "contains" ? 0.5 : 0.1;
};

/*** Renders one group of graph links as a single instanced Segments batch and keeps their endpoints glued to the live (d3-mutated) node positions every frame, imperatively, so dragging never triggers a React re-render. drei's <Segments> already rebuilds its buffer each frame from each Segment's start/end vectors; we just mutate those vectors in place. ***/
function LinkSegments({ links, opacity, color }) {
  const segRefs = useRef([]);

  useFrame(() => {
    const segs = segRefs.current;
    for (let i = 0; i < links.length; i++) {
      const seg = segs[i];
      const l = links[i];
      if (!seg || !l?.source || !l?.target) continue;
      seg.start.set(l.source.x ?? 0, l.source.y ?? 0, -60);
      seg.end.set(l.target.x ?? 0, l.target.y ?? 0, -60);
    }
  });

  if (links.length === 0) return null;

  return (
    <Segments limit={links.length} lineWidth={0.4} transparent opacity={opacity}>
      {links.map((link, idx) => (
        <Segment
          key={idx}
          ref={(el) => (segRefs.current[idx] = el)}
          start={[link.source.x ?? 0, link.source.y ?? 0, -60]}
          end={[link.target.x ?? 0, link.target.y ?? 0, -60]}
          color={color}
        />
      ))}
    </Segments>
  );
}

const GraphScene = ({
  rawGraphData,
  navigate,
  allowedNodeTypes,
  hideDetails,
  setHideDetails,
  useShopLinkPhysics = false,
  centerNodeId = null,
  onReady,
  zoomApiRef,
}) => {
  const [blur, setBlur] = useState(2);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);

  /*** Expose a zoom API so on-screen +/- buttons can drive the camera the same way the scroll wheel / pinch does, accessible without a scroll wheel. Animating camera.zoom and calling controls.update() keeps OrbitControls in sync and still fires its change handler (which toggles the detail/zoom threshold). ***/
  useEffect(() => {
    if (!zoomApiRef) return undefined;
    const zoomBy = (factor) => {
      if (!camera || !controls) return;
      const minZ = controls.minZoom ?? 0.1;
      const maxZ = controls.maxZoom ?? Infinity;
      const target = THREE.MathUtils.clamp(camera.zoom * factor, minZ, maxZ);
      gsap.to(camera, {
        zoom: target,
        duration: 0.4,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => {
          camera.updateProjectionMatrix();
          controls.update();
        },
      });
    };
    zoomApiRef.current = {
      zoomIn: () => zoomBy(1.35),
      zoomOut: () => zoomBy(1 / 1.35),
    };
    return () => {
      if (zoomApiRef) zoomApiRef.current = null;
    };
  }, [zoomApiRef, camera, controls]);
  const [colorTextSecondary] = useThemeVar("--color-text-secondary");
  /*** The graph STRUCTURE (which nodes/links exist), published once when the layout settles, and again only on a genuine rebuild. Positions are NOT in React state: they live on the d3 node objects and are read imperatively per frame (see node useFrames + LinkSegments). ***/
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [isDragging, setIsDragging] = useState(false);

  const dragNodeRef = useRef(null);
  const simNodesRef = useRef([]);
  const simulationRef = useRef(null);
  const hideDetailsRef = useRef(hideDetails);

  useEffect(() => {
    hideDetailsRef.current = hideDetails;
  }, [hideDetails]);

  const { invalidate } = useThree();

  useEffect(() => {
    const handlePointerUp = () => {
      if (dragNodeRef.current) {
        const target = simNodesRef.current.find(
          (n) => n.id === dragNodeRef.current.id,
        );
        if (target) {
          target.fx = null;
          target.fy = null;
        }
      }
      dragNodeRef.current = null;
      setIsDragging(false);
      simulationRef.current?.alphaTarget(0);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  useEffect(() => {
    if (!rawGraphData || rawGraphData.nodes.length === 0) return;

    let nodesToUse = rawGraphData.nodes;
    if (allowedNodeTypes && allowedNodeTypes.length > 0) {
      nodesToUse = rawGraphData.nodes.filter((n) =>
        allowedNodeTypes.includes(n.type),
      );
    }

    const validNodeIds = new Set(nodesToUse.map((n) => n.id));
    const linksToUse = rawGraphData.links.filter(
      (l) =>
        validNodeIds.has(l.source.id || l.source) &&
        validNodeIds.has(l.target.id || l.target),
    );

    simNodesRef.current = nodesToUse.map((n) => ({ ...n }));
    const links = linksToUse.map((l) => ({ ...l }));

    /*** Pin the chosen centre node to the origin. The homepage passes the active curator's moodboard id (see App); detail views and the fallback use the synthetic idNr-99 node. We resolve only an index here and pin via direct ref-array access, so the pinned node is plainly a simulation node. ***/
    let centerIdx = simNodesRef.current.findIndex((n) => n.idNr === 99);
    if (centerNodeId) {
      const i = simNodesRef.current.findIndex((n) => n.id === centerNodeId);
      if (i !== -1) centerIdx = i;
    }
    if (centerIdx !== -1) {
      simNodesRef.current[centerIdx].fx = 0;
      simNodesRef.current[centerIdx].fy = 0;
    }

    /*** Restore the home canvas's last layout if we have one for this same centred board, so returning from a detail page keeps the visitor's untangling. Only home is cached (detail views pass allowedNodeTypes/shop physics). ***/
    const isHome =
      (!allowedNodeTypes || allowedNodeTypes.length === 0) &&
      !useShopLinkPhysics;
    const restored =
      isHome &&
      homeLayoutCache &&
      homeLayoutCache.centerNodeId === centerNodeId;
    if (restored) {
      for (let i = 0; i < simNodesRef.current.length; i++) {
        const p = homeLayoutCache.positions.get(simNodesRef.current[i].id);
        if (p) {
          simNodesRef.current[i].x = p.x;
          simNodesRef.current[i].y = p.y;
          simNodesRef.current[i].vx = p.vx;
          simNodesRef.current[i].vy = p.vy;
        }
      }
    }

    /*** The mobile viewport is very narrow, so the desktop link distances leave the centre node alone on screen with edges trailing off; have to drag a LOT to reach the first facet. Pull everything in tighter on mobile: shorter links, gentler repulsion, smaller collision radii. ***/
    const isMobile = window.innerWidth < 1024;
    const linkScale = isMobile ? 0.55 : 1;
    const collideScale = isMobile ? 0.6 : 1;

    simulationRef.current = d3
      .forceSimulation(simNodesRef.current)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(
            (link) => getLinkDistance(link, useShopLinkPhysics) * linkScale,
          )
          .strength((link) => getLinkStrength(link, useShopLinkPhysics)),
      )
      .force(
        "charge",
        d3.forceManyBody().strength((node) => {
          const base = isMobile ? -300 : -600;
          /*** The big central circles (moodboards, plus the shop/curator a detail page is built around) repel much harder so their clusters push apart and the layout reads less tangled (applies on desktop too). ***/
          return isCentral(node) ? base * 3.5 : base;
        }),
      )
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((node) => {
            /*** Central circles are visually large, so a wide collision radius keeps neighbouring boards (and their floating titles) clear of the centre circle, instead of overlapping behind it. ***/
            if (node.type === "shop" || node.type === "curator")
              return 200 * collideScale;
            if (node.type === "moodboard") return 160 * collideScale;
            if (node.type === "vibe") return 150 * collideScale;
            if (node.type === "item") return 120 * collideScale;
            return 60 * collideScale;
          })
          .strength(1)
          .iterations(3),
      )
      .force("x", d3.forceX(0).strength(0.005))
      .force("y", d3.forceY(0).strength(0.005))
      .velocityDecay(0.6)
      .stop();

    simulationRef.current.on("tick", () => {
      if (dragNodeRef.current) {
        const target = simNodesRef.current.find(
          (n) => n.id === dragNodeRef.current.id,
        );
        if (target) {
          target.fx = dragNodeRef.current.fx;
          target.fy = dragNodeRef.current.fy;
        }
      }
      /*** No setState here. Node groups and link segments read these live, d3-mutated positions every frame via useFrame, so the running simulation never forces a React reconciliation. (The old per-tick setAnimatedData re-rendered all ~79 node subtrees + their <Html> overlays every frame; the source of the 400ms+ drag stalls!)
      
      invalidate() keeps the canvas painting while the sim is warm, and is what a future frameloop="demand" would rely on. ***/
      invalidate();
    });

    /*** Settle the layout to its resting state in small batches across animation frames rather than one blocking `tick(300)`.***
    
    The synchronous fast-forward hogged the main thread exactly while the loading screen was up, freezing its spinning diamond (and on a quick re-navigation the overlay's canvas hadn't even painted its first frame, so the diamond appeared to vanish until the work finished). Chunking yields to the browser between batches, so the loading animation stays smooth; the settled graph is published once at the end (it's hidden behind the overlay until then anyway).
    
    A restored layout is already settled, so skip the spread and publish it as is; a fresh layout still settles over 300 ticks. ***/
    let ticksLeft = restored ? 0 : 300;
    let settleRaf;
    const settle = () => {
      const batch = Math.min(40, ticksLeft);
      simulationRef.current.tick(batch);
      ticksLeft -= batch;
      if (ticksLeft > 0) {
        settleRaf = requestAnimationFrame(settle);
      } else {
        // Publish the graph structure ONCE, settled. We hand over the very arrays d3 keeps mutating (simNodesRef.current / links) so every node and link can read live coordinates each frame without new state.
        setGraph({ nodes: simNodesRef.current, links });
        // Layout settled and published -> the canvas is ready to be revealed!
        onReady?.();
      }
    };
    settleRaf = requestAnimationFrame(settle);

    return () => {
      cancelAnimationFrame(settleRaf);
      simulationRef.current?.stop();
      // Stash the current home layout on the way out so a return trip restores it (keyed by the centred board, so a curator switch lays out fresh).
      if (isHome) {
        const positions = new Map();
        for (const n of simNodesRef.current) {
          positions.set(n.id, {
            x: n.x,
            y: n.y,
            vx: n.vx ?? 0,
            vy: n.vy ?? 0,
          });
        }
        homeLayoutCache = { centerNodeId, positions };
      }
    };
    /*** centerNodeId is intentionally NOT a dependency: the canvas centres on the active curator's moodboard when the scene first mounts (onboarding choice/entering the canvas), but switching curators on the bottom bar afterwards is a theme change only - it must NOT re-run the simulation and yank the graph to a new centre. Re-centring on demand will be driven explicitly by the future search feature. ***/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawGraphData, allowedNodeTypes, useShopLinkPhysics]);

  // Group links by type once, when the graph is (re)published — not on every render. The per-group opacity still reacts to hideDetails in the JSX below.
  const groupedLinks = useMemo(() => {
    const groups = { vibe: [], moodboard: [], shop: [], standard: [] };
    graph.links.forEach((link) => {
      if (link.source.x == null || link.target.x == null) return;
      const isContains = link.relationType === "contains";
      if (isContains) {
        if (link.source.type === "vibe") groups.vibe.push(link);
        else if (link.source.type === "moodboard") groups.moodboard.push(link);
        else if (link.source.type === "shop" || link.source.type === "curator")
          groups.shop.push(link);
        else groups.standard.push(link);
      } else {
        groups.standard.push(link);
      }
    });
    return groups;
  }, [graph.links]);

  return (
    <>
      {/* No internal fallback: the App-level overlay is the single loading screen (full diamond for the canvas build, minimal for detail views). A fallback here just flashed a second, mismatched loader for a frame. */}
      <Suspense fallback={null}>
        {/* <Perf position="bottom-left" /> */}
        <ambientLight intensity={2} />
        <Environment preset="city" />

        <OrbitControls
          makeDefault
          enabled={!isDragging}
          enableRotate={false}
          minZoom={0.6}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: null,
          }}
          touches={{
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          onChange={(e) => {
            const currentZoom = e.target.object.zoom;
            const shouldHide = currentZoom < 1.5;

            if (shouldHide && !hideDetailsRef.current) {
              hideDetailsRef.current = true;
              setHideDetails(true);
              setBlur(20);
              return;
            }

            if (!shouldHide && hideDetailsRef.current) {
              hideDetailsRef.current = false;
              setHideDetails(false);
              setBlur(2);
            }
          }}
        />

        <mesh
          position={[0, 0, -100]}
          onPointerMove={(e) => {
            if (isDragging && dragNodeRef.current) {
              dragNodeRef.current.fx = e.point.x;
              dragNodeRef.current.fy = e.point.y;
            }
          }}
        >
          <planeGeometry args={[100000, 100000]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        <LinkSegments
          links={groupedLinks.vibe}
          opacity={hideDetails ? 0.8 : 0.2}
          color={colorTextSecondary}
        />
        <LinkSegments
          links={groupedLinks.moodboard}
          opacity={hideDetails ? 0.5 : 0.3}
          color={colorTextSecondary}
        />
        <LinkSegments
          links={groupedLinks.shop}
          opacity={hideDetails ? 0.4 : 0.5}
          color={colorTextSecondary}
        />
        <LinkSegments
          links={groupedLinks.standard}
          opacity={!hideDetails ? 0 : 0.1}
          color={colorTextSecondary}
        />

        <SharedMaterialsProvider blur={blur}>
          {graph.nodes.map((node) => (
            <CanvasNode
              hideDetails={hideDetails}
              key={node.id}
              node={node}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              dragNodeRef={dragNodeRef}
              simulationRef={simulationRef}
              navigate={navigate}
              distanceFactor={128}
              images={true}
            />
          ))}
        </SharedMaterialsProvider>
      </Suspense>
    </>
  );
};

export default GraphScene;

export function CanvasViewer({
  graphData,
  allowedNodeTypes,
  hideDetails,
  setHideDetails,
  useShopLinkPhysics,
  onReady,
  zoomApiRef,
}) {
  const navigate = useNavigate();
  const defaultGraphData = useGraph();

  const dataToRender = graphData || defaultGraphData;

  return (
    <div className="h-screen w-screen">
      <Canvas
        dpr={[0.5, 1]}
        performance={{ min: 0.1 }}
        orthographic
        camera={{ zoom: 3, position: [0, 0, 500], near: 1, far: 2000 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(window.devicePixelRatio);
          // Disable shadows if not needed for a massive boost
          gl.shadowMap.enabled = false;
        }}
      >
        <GraphScene
          rawGraphData={dataToRender}
          allowedNodeTypes={allowedNodeTypes}
          navigate={navigate}
          hideDetails={hideDetails}
          setHideDetails={setHideDetails}
          useShopLinkPhysics={useShopLinkPhysics}
          onReady={onReady}
          zoomApiRef={zoomApiRef}
        />
      </Canvas>
    </div>
  );
}
