import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import DashEllipse from "./jsx-assets/DashEllipse";

/*** The synthesised centre node of the curator detail drill-down (id "curator-<slug>").***

Mirrors ShopNode's big-circle treatment, but tailored to a curator's fields: subculture, name, @handle, a tone line, and their picks count, with the avatar as the offset portrait. Reuses the shop ring instance.

Scaled down on mobile (see ShopNode) so the big circle fits a phone screen. ***/
const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

const CuratorNode = ({
  node,
  setIsDragging,
  dragNodeRef,
  simulationRef,
  ShopInstance,
}) => {
  // Position driven imperatively from the live d3 node each frame (no per-tick React re-render) — see GraphScene.
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current)
      groupRef.current.position.set(node.x ?? 0, node.y ?? 0, 0);
  });

  return (
    <ShopInstance
      key={node.id}
      ref={groupRef}
      position={[node.x ?? 0, node.y ?? 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        setIsDragging(true);
        dragNodeRef.current = { id: node.id, fx: node.x, fy: node.y };
        simulationRef.current?.alphaTarget(0.3).restart();
      }}
    >
      <Html
        position={[0, 0, 0]}
        center
        style={{ pointerEvents: "none", userSelect: "none" }}
        distanceFactor={isMobile ? 0.24 : 0.3}
      >
        <div className="shop-circle p-10 pt-16 lg:p-28 lg:pt-32 flex items-center justify-center relative">
          <div className="shop-circle-surface" />

          <div className="relative z-10 flex w-full lg:max-w-[26rem] flex-col items-center lg:items-start gap-6 lg:gap-12">
            {/* Identity + bio sit centred at the top. The tip then breaks to the
                left (self-start) to fill the bottom-left and balance the portrait
                that sits bottom-right. Generous gaps keep the three apart. */}
            <div className="flex flex-col gap-1.5 max-w-[34ch] items-center text-center lg:items-start lg:text-left">
              {node.subculture && (
                <p className="p-reg-h text-primary-2 uppercase">
                  {node.subculture}
                </p>
              )}
              <h3 className="text-wrap text-text-main text-2xl lg:text-3xl">
                {node.title}
              </h3>
              {node.handle && (
                <p className="p-reg-h text-text-secondary">{node.handle}</p>
              )}
              {node.moodboardCount > 0 && (
                <p className="caption text-text-secondary">
                  {node.moodboardCount} moodboard
                  {node.moodboardCount === 1 ? "" : "s"} curated
                </p>
              )}
            </div>
            {node.details && (
              <p className="p-reg text-text-main max-w-[44ch] lg:max-w-full text-center lg:text-left">
                {node.details}
              </p>
            )}
            {node.antwerpTip && (
              <div className="l flex flex-col gap-1 max-w-[40ch] lg:max-w-[48ch] items-center text-center lg:items-start lg:text-left">
                <p className="p-reg-h text-primary-2 uppercase">Antwerp tip</p>
                <p className="p-reg text-text-secondary">{node.antwerpTip}</p>
              </div>
            )}
          </div>
          <DashEllipse scale={"scale-200 lg:scale-260"} />
          {node.photo && (
            <div className="-bottom-28 -right-28 z-20 absolute rounded-full w-90 h-90 lg:w-100 lg:h-100 p-20">
              <img
                className="rounded-full object-cover opacity-50 w-full h-auto aspect-square"
                src={node.photo}
                alt={node.title}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>
      </Html>
    </ShopInstance>
  );
};

export default CuratorNode;
