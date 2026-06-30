import { useMemo, useContext, memo } from "react";
import VibeNode from "./VibeNode";
import ItemNode from "./ItemNode";
import { MaterialContext } from "./MaterialsContext";
import MoodNode from "./MoodNode";
import ShopNode from "./ShopNode";
import CuratorNode from "./CuratorNode";

const getStableShapeIndex = (id, shapeCount) => {
  if (shapeCount === 0) return 0;

  const source = String(id);
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return hash % shapeCount;
};

const CanvasNode = ({
  node,
  setIsDragging,
  dragNodeRef,
  simulationRef,
  hideDetails,
  navigate,
  distanceFactor,
  images,
  isDragging,
}) => {
  const { parsedShapes, Instances } = useContext(MaterialContext);

  const type = node.type;

  const shapeIndex = useMemo(() => {
    if (type !== "item" && type !== "shop") return 0;
    return getStableShapeIndex(node.id, parsedShapes.length);
  }, [node.id, type, parsedShapes.length]);

  if (type === "vibe") {
    const VibeInstance = Instances[0];
    return (
      <VibeNode
        node={node}
        setIsDragging={setIsDragging}
        dragNodeRef={dragNodeRef}
        simulationRef={simulationRef}
        VibeInstance={VibeInstance}
      />
    );
  } else if (type === "moodboard") {
    const MoodInstance = Instances[2];
    return (
      <MoodNode
        node={node}
        dragNodeRef={dragNodeRef}
        setIsDragging={setIsDragging}
        simulationRef={simulationRef}
        MoodInstance={MoodInstance}
        hideDetails={hideDetails}
        isDragging={isDragging}
      />
    );
  } else if (type === "shop" && String(node.id).startsWith("shop-")) {
    // Synthesized centre node of the ShopDetail drill-down (id "shop-<name>").
    // Real shop FACETS fall through to the pink ItemNode branch below.
    const ShopInstance = Instances[4];
    return (
      <ShopNode
        node={node}
        dragNodeRef={dragNodeRef}
        setIsDragging={setIsDragging}
        simulationRef={simulationRef}
        ShopInstance={ShopInstance}
      />
    );
  } else if (type === "curator") {
    // Synthesized centre node of the CuratorDetail drill-down (id
    // "curator-<slug>"). Reuses the shop ring instance for its surround.
    const ShopInstance = Instances[4];
    return (
      <CuratorNode
        node={node}
        dragNodeRef={dragNodeRef}
        setIsDragging={setIsDragging}
        simulationRef={simulationRef}
        ShopInstance={ShopInstance}
      />
    );
  } else if (type === "item" || type === "shop") {
    // shop facets render in the pink ("cat2") style; products (items) render blue.
    const isCat2 = type === "shop";

    const ItemRingInstance = Instances[1];
    const ItemBgInstance = Instances[3]; // 1. Extract the new background instance

    const GlassInstance = Instances[5 + shapeIndex * 2 + (isCat2 ? 1 : 0)];
    const svgScale = parsedShapes[shapeIndex].svgScale;
    const shapeGeo = parsedShapes[shapeIndex].shapeGeo;

    return (
      <ItemNode
        node={node}
        hideDetails={hideDetails}
        dragNodeRef={dragNodeRef}
        setIsDragging={setIsDragging}
        simulationRef={simulationRef}
        GlassInstance={GlassInstance}
        ItemRingInstance={ItemRingInstance}
        ItemBgInstance={ItemBgInstance}
        svgScale={svgScale}
        shapeGeo={shapeGeo}
        isCat2={isCat2}
        navigate={navigate}
        distanceFactor={distanceFactor}
        images={images}
      />
    );
  }
  return null;
};

// Memoised so structural GraphScene re-renders (drag start/end, zoom-threshold
// blur/hideDetails) don't re-render every node subtree. Node identity is stable
// (the same d3-mutated object) and position is driven imperatively via useFrame,
// so a node only needs to re-render when hideDetails actually flips.
export default memo(CanvasNode);
