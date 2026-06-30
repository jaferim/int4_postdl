import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { getCuratorByMoodboardTitle } from "../lib/curators";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const MoodNode = ({
  node,
  setIsDragging,
  dragNodeRef,
  simulationRef,
  MoodInstance,
  hideDetails,
  isDragging,
}) => {
  const curatorMeta = getCuratorByMoodboardTitle(node.title);
  const curatorName = node.curator ?? curatorMeta?.name ?? null;
  const curatorAvatar = curatorMeta?.avatar ?? null;

  const [diamondEl, setDiamondEl] = useState(null);

  useGSAP(() => {
    if (!diamondEl) return;

    let initialOpacity = 0.4;
    if (hideDetails) initialOpacity = 0;
    else if (isDragging) initialOpacity = 0.6;

    gsap.set(diamondEl, {
      opacity: initialOpacity,
    });

    gsap.to(diamondEl, {
      yPercent: -10,
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }, [diamondEl]);

  useGSAP(() => {
    if (!diamondEl) return;

    let targetOpacity = 0.4;
    if (hideDetails) {
      targetOpacity = 0;
    } else if (isDragging) {
      targetOpacity = 0.6;
    }

    gsap.to(diamondEl, {
      opacity: targetOpacity,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [diamondEl, hideDetails, isDragging]);

  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current)
      groupRef.current.position.set(node.x ?? 0, node.y ?? 0, 0);
  });

  return (
    <MoodInstance
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
        position={[-2, 0, -1]}
        center
        distanceFactor={0.3}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="relative flex-centered gap-2.5 w-88 flex-col">
          <div
            ref={setDiamondEl}
            className="pointer-events-none select-none absolute -rotate-10 -translate-x-1/2 left-1/2 -top-36 z-0 w-60 [-webkit-mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]"
          >
            <img
              src="/assets/images/karat-diamond.png"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-contain block"
            />

            <div
              className="absolute inset-0 bg-primary-1 mix-blend-color opacity-80"
              style={{
                WebkitMaskImage: `url('/assets/images/karat-diamond.png')`,
                maskImage: `url('/assets/images/karat-diamond.png')`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </div>
          <p className="p-reg-h text-text-secondary relative z-10">MOODBOARD</p>
          <h4 className="text-text-main h-small font-body-light text-center relative z-10 opacity-60">
            {node.title}
          </h4>
          <div className="flex-centered gap-2 relative z-10">
            {(curatorAvatar || curatorName) && (
              <>
                <div className="flex-centered gap-1">
                  {curatorAvatar ? (
                    <img
                      src={curatorAvatar}
                      alt={curatorName ?? ""}
                      className="w-3 h-3 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-text-secondary" />
                  )}
                  {curatorName && (
                    <p className="p-reg text-text-secondary">{curatorName}</p>
                  )}
                </div>
                <div className="rounded-full w-1 h-1 bg-text-secondary"></div>
              </>
            )}
            <p className="p-reg text-text-secondary">
              {node.itemCount ?? 0} item{node.itemCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Html>
    </MoodInstance>
  );
};

export default MoodNode;
