import { Environment, Center } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Diamond, { themeDiamondMaterial } from "./jsx-assets/Diamond.jsx";
import { useEffect, useRef, useState, useMemo } from "react";
import { getCuratorBySlug } from "../lib/curators.js";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import DashEllipse from "./jsx-assets/DashEllipse.jsx";
import IntroPt1 from "./IntroPt1.jsx";
import ProgressDots from "./ProgressDots.jsx";
import IntroButton from "./IntroButton.jsx";
import IntroMain from "./Intro2&3.jsx";
import * as THREE from "three";

const Intro = ({ setIsIntro }) => {
  const [diamond, setDiamond] = useState(null);
  const [part, setPart] = useState(1);
  const [selectedCurator, setSelectedCurator] = useState(null);

  const diamondWrapperRef = useRef();
  const circlesRef = useRef();
  const shardRef = useRef();
  const materialRef = useRef(null);
  const sideControlsRef = useRef(null);

  useEffect(() => {
    if (part !== 3 || !selectedCurator) return;
    const curator = getCuratorBySlug(selectedCurator);
    if (!curator) return;
    document.documentElement.setAttribute("data-theme", curator.theme);
    themeDiamondMaterial(materialRef.current);
  }, [part, selectedCurator]);

  const handlePart = () => {
    if (part >= 3) {
      setIsIntro(false);
    } else {
      setPart((prev) => prev + 1);
    }
  };

  useGSAP(() => {
    gsap.from([circlesRef.current, sideControlsRef.current], {
      scale: 0,
      opacity: 0,
      duration: 1.2,
      ease: "back.out(1.2)",
      stagger: 0.1,
    });
  }, []);

  useGSAP(() => {
    if (!diamond) return;

    if (part === 1) {
      gsap.from(diamond.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.2,
        delay: 0.1,
        ease: "back.out(1.2)",
      });
    }

    gsap.to(diamond.rotation, {
      y: -Math.PI * 2,
      duration: 16,
      repeat: -1,
      ease: "none",
    });
  }, [diamond]);

  useGSAP(() => {
    if (!shardRef.current) return;

    if (part === 2) {
      gsap.to(diamondWrapperRef.current, {
        xPercent: 26,
        yPercent: -15,
        duration: 2,
        ease: "power2.out",
      });
      gsap.to(
        circlesRef.current,
        {
          xPercent: 26,
          yPercent: -20,
          duration: 2,
          scale: 0.7,
          ease: "power2.out",
        },
        "<",
      );

      gsap.to(diamond.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.5,
        ease: "power3.out",
      });

      const shards = shardRef.current.children;
      const center = new THREE.Vector3();
      shards.forEach((child) => center.add(child.position));
      center.divideScalar(shards.length);

      shards.forEach((child) => {
        gsap.killTweensOf(child.position);

        const outwardDirection = new THREE.Vector3()
          .subVectors(child.position, center)
          .normalize();

        const randomForce = 0.1 + Math.random() * 0.2;

        gsap.to(child.position, {
          x: child.position.x + outwardDirection.x * randomForce,
          y: child.position.y + outwardDirection.y * randomForce,
          z: child.position.z + outwardDirection.z * randomForce,
          duration: 1.5,
          ease: "power3.out",
          onComplete: () => {
            gsap.to(child.position, {
              y: `+=${Math.random() * 0.1}`,
              duration: 3 + Math.random(),
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          },
        });
      });
    } else if (part === 3) {
      gsap.to(diamond.scale, {
        x: 0.4,
        y: 0.4,
        z: 0.4,
        duration: 1.5,
        ease: "power3.out",
      });
      gsap.to(
        diamondWrapperRef.current,
        {
          scale: 1.6,
          duration: 1.5,
          ease: "power3.out",
        },
        "<=",
      );

      const shards = shardRef.current.children;
      const center = new THREE.Vector3();
      shards.forEach((child) => center.add(child.position));
      center.divideScalar(shards.length);

      shards.forEach((child) => {
        gsap.killTweensOf(child.position);

        const outwardDirection = new THREE.Vector3()
          .subVectors(child.position, center)
          .normalize();

        const randomForce = 0.5 + Math.random() * 0.5;

        gsap.to(child.position, {
          x: child.position.x + outwardDirection.x * randomForce,
          y: child.position.y + outwardDirection.y * randomForce,
          z: child.position.z + outwardDirection.z * randomForce,
          duration: 1.5,
          ease: "power3.out",
          onComplete: () => {
            gsap.to(child.position, {
              y: `+=${Math.random() * 0.1}`,
              duration: 3 + Math.random(),
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          },
        });
      });
    }
  }, [part]);

  useGSAP(() => {
    const handleMousePos = (e) => {
      const mouseY = e.clientY;
      const delta = 0.2;

      gsap.to(sideControlsRef.current, {
        yPercent: mouseY * delta,
        duration: 0.6,
        ease: "power2.out",
      });
    };
    window.addEventListener("mousemove", handleMousePos);
  }, [diamond]);

  const diamondModel = useMemo(
    () => (
      <Diamond
        scale={0.5}
        position={[0, 0, 0]}
        ref={shardRef}
        materialRef={materialRef}
      />
    ),
    [],
  );

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-accentbg">
      <div
        className={`absolute inset-0 z-0 pointer-events-none items-center justify-center ${part > 1 ? "hidden lg:flex" : "flex"}`}
        ref={circlesRef}
      >
        <div className="relative flex items-center justify-center w-[70vw] md:w-[40vw] aspect-square">
          <div className="abs-centered w-[150%] aspect-square rounded-full border border-text-intro2 opacity-40"></div>
          <DashEllipse
            scale="scale-300"
            stroke="0.2"
            color="var(--color-text-secondary)"
            widthHeight="w-[55%] md:w-[70%] lg:w-[60%] h-auto aspect-square"
          />
        </div>
      </div>
      <div className="absolute inset-0 z-10">
        {part === 1 ? (
          <IntroPt1 onClick={handlePart} setIsIntro={setIsIntro} />
        ) : (
          <IntroMain
            part={part}
            onClick={handlePart}
            setIsIntro={setIsIntro}
            selectedCurator={selectedCurator}
            setSelectedCurator={setSelectedCurator}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 z-20 items-center justify-center ${part > 1 ? "hidden lg:flex" : "flex"} pointer-events-none`}
        ref={diamondWrapperRef}
      >
        <div className="w-[calc(70vw+1rem)] md:w-[calc(50vw+1rem)] lg:w-[calc(42vw+1rem)] h-auto aspect-square relative">
          {part === 1 && (
            <div
              ref={sideControlsRef}
              className="hidden absolute md:right-[-45%] lg:right-[-50%] xl:right-[-40%] top-1/3 p-4 bg-accentbg md:flex flex-col gap-5 pointer-events-auto"
            >
              <ProgressDots part={part} />
              <IntroButton onClick={handlePart} />
            </div>
          )}
          <div className="absolute inset-0">
            <Canvas
              camera={{ position: [0, 4, 8], fov: 8, near: 0.1, far: 2000 }}
              style={{ pointerEvents: "none" }}
            >
              <ambientLight intensity={0.1} />
              <Environment preset="city" />
              <Center ref={setDiamond} rotation={[0, 0, 0.2]}>
                {diamondModel}
              </Center>
            </Canvas>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Intro;
