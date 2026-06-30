import { Canvas } from "@react-three/fiber";
import Diamond, { themeDiamondMaterial } from "./jsx-assets/Diamond";
import { Center, Environment } from "@react-three/drei";
import DashEllipse from "./jsx-assets/DashEllipse";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

/*** Spinning rings whose motion survives a busy main thread. *** 

The rotation lives on a wrapping <div>'s `transform` (which the browser composites, like the text's opacity pulse); an SVG's own CSS animation is NOT composited and freezes when the thread is blocked, which is exactly when a loader needs to look alive.

Fills its (square) parent: a faint static inner circle + the composited spinning dashed ring at the parent's full size. The parent decides the size, so the diamond/text placed alongside can be sized relative to the same box. ***/
const SpinningRings = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square rounded-full border border-text-intro2 opacity-40" />
    <div
      className="absolute inset-0 animate-rotate-fast"
      style={{ willChange: "transform" }}
    >
      <DashEllipse
        scale="scale-100"
        stroke="0.6"
        color="#7B7E8C"
        widthHeight="w-full h-full"
        animationClass=""
      />
    </div>
  </div>
);

/*** `variant`:
    "full" — the 3D diamond build screen, for the heavy canvas mount. The WebGL gem can't tick while the main thread parses geometry, so the composited rings carry the motion; on exit it fractures.
    "minimal" — text + composited rings only, no WebGL. For the quicker detail transitions, where a full diamond-shatter build would be overkill. ***/
const Loading = ({
  fullScreen = true,
  message = "LOADING...",
  exiting = false,
  variant = "full",
}) => {
  const [diamond, setDiamond] = useState(null);
  const materialRef = useRef(null);
  const shardRef = useRef(null);

  // The diamond carries the active curator's colour into the loading screen.
  useEffect(() => {
    if (diamond) themeDiamondMaterial(materialRef.current);
  }, [diamond]);

  useGSAP(() => {
    if (!diamond) return;

    gsap.to(diamond.rotation, {
      y: -Math.PI * 2,
      duration: 4,
      repeat: -1,
      ease: "none",
      overwrite: true,
    });
  }, [diamond]);

  // When loader is on its way out, fracture the diamond apart: each shard flies outward from the centre while the whole gem shrinks away. Clean transition into the page.
  useGSAP(() => {
    if (!exiting || !shardRef.current) return;
    const shards = shardRef.current.children;
    if (!shards.length) return;

    const center = new THREE.Vector3();
    shards.forEach((c) => center.add(c.position));
    center.divideScalar(shards.length);

    shards.forEach((c) => {
      const dir = new THREE.Vector3()
        .subVectors(c.position, center)
        .normalize();
      const force = 0.4 + Math.random() * 0.6;
      gsap.to(c.position, {
        x: c.position.x + dir.x * force,
        y: c.position.y + dir.y * force,
        z: c.position.z + dir.z * force,
        duration: 1.4,
        ease: "power2.out",
      });
    });

    if (diamond) {
      // Shrink away a touch slower than the shards fly, so the break reads.
      gsap.to(diamond.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 1.5,
        ease: "power1.in",
      });
    }
  }, [exiting]);

  const containerClass = `flex items-center justify-center flex-col bg-normalbg text-text-main z-50 relative ${
    fullScreen
      ? "fixed inset-0 h-screen w-screen"
      : "w-full h-full min-h-[50vh]"
  }`;

  if (variant === "minimal") {
    // No diamond; just the rings with the message centred inside them, in the larger display font.
    return (
      <div className={containerClass}>
        <div className="relative w-[min(72vw,22rem)] aspect-square flex items-center justify-center">
          <SpinningRings />
          <p className="relative z-10 max-w-[60%] text-center font-display-pixel text-lg lg:text-xl text-text-main animate-pulse">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="relative w-[min(80vw,30rem)] aspect-square flex items-center justify-center">
        <SpinningRings />

        <div className="relative z-10 w-[70%] aspect-square overflow-visible">
          <Canvas
            camera={{ position: [0, 4, 10], fov: 15, near: 0.1, far: 2000 }}
            style={{ pointerEvents: "none" }}
          >
            <ambientLight intensity={0.1} />
            <Environment preset="city" />
            <Center ref={setDiamond} rotation={[0, 0, 0.2]}>
              <Diamond ref={shardRef} materialRef={materialRef} />
            </Center>
          </Canvas>
        </div>
      </div>

      <p className="mt-10 p-large-h text-text-secondary text-center max-w-[80vw] animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default Loading;
