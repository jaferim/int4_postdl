import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import DashEllipse from "./jsx-assets/DashEllipse";

const VibeNode = ({
  node,
  dragNodeRef,
  setIsDragging,
  simulationRef,
  VibeInstance,
}) => {
  // Position driven imperatively from the live d3 node each frame (no per-tick React re-render). see GraphScene.
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current)
      groupRef.current.position.set(node.x ?? 0, node.y ?? 0, 0);
  });

  return (
    <VibeInstance
      key={node.id}
      ref={groupRef}
      position={[node.x ?? 0, node.y ?? 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsDragging(true);
        dragNodeRef.current = { id: node.id, fx: node.x, fy: node.y };

        simulationRef.current?.alphaTarget(0.3).restart();
      }}
    >
      <Html
        position={[0, 0, 0]}
        center
        style={{ pointerEvents: "none", userSelect: "none" }}
        distanceFactor={0.3}
      >
        <div className="relative">
          <div className="base-circle flex-centered pt-2">
            <p className="text-xl uppercase font-display-pixel w-[80%] opacity-70 text-wrap text-center text-text-main">
              {node.title}
            </p>
          </div>
          <DashEllipse scale={"scale-90"} stroke="0.8" />
        </div>
      </Html>
    </VibeInstance>
  );
};

export default VibeNode;
