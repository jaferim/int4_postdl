import { useEffect, useState, useRef, Suspense } from "react";
import CornerGrid from "./jsx-assets/CornerGrid";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const SkylineShaderMaterial = shaderMaterial(
  { uTime: 0, uTexture: new THREE.Texture() },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  varying vec2 vUv;
  uniform float uTime;
  uniform sampler2D uTexture;
  
  void main() {
    vec2 uv = vUv;
    
    // Wavy distortion math
    uv.y += sin(uv.x * 8.0 + uTime * 1.2) * 0.015;
    uv.x += cos(uv.y * 8.0 + uTime * 1.2) * 0.005;

    gl_FragColor = texture2D(uTexture, uv);
  }
  `,
);

extend({ SkylineShaderMaterial });

const WavySkyline = () => {
  const texture = useTexture("/assets/images/antwerp-skyline.png");
  const materialRef = useRef();
  const { viewport } = useThree();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <skylineShaderMaterial ref={materialRef} uTexture={texture} transparent />
    </mesh>
  );
};

const Background = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const mousePosRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const [gradientSize, setGradientSize] = useState({ radius: 45 });
  const sizeRef = useRef({ radius: 45 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Run on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useGSAP(() => {
    const handleMouseMove = (e) => {
      gsap.to(mousePosRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => setMousePos({ ...mousePosRef.current }),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useGSAP(() => {
    const handleHover = (e) => {
      const isHovered = e.detail;
      gsap.killTweensOf(sizeRef.current);

      if (isHovered) {
        gsap.to(sizeRef.current, {
          radius: 75,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          onUpdate: () => setGradientSize({ ...sizeRef.current }),
        });
      } else {
        gsap.to(sizeRef.current, {
          radius: 45,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => setGradientSize({ ...sizeRef.current }),
        });
      }
    };

    window.addEventListener("item-hover", handleHover);
    return () => window.removeEventListener("item-hover", handleHover);
  }, []);

  return (
    <div
      className="h-screen w-screen fixed top-0 left-0 pointer-events-none"
      style={{
        background: `radial-gradient(circle ${gradientSize.radius}vmax at ${mousePos.x}px ${mousePos.y}px, var(--color-accentbg) 0%, var(--color-normalbg) 100%)`,
      }}
    >
      <CornerGrid alignment="top-0 left-0" rotate="-scale-x-100 -scale-y-100" />
      <CornerGrid alignment="bottom-0 right-0" rotate="scale-100" />
      <CornerGrid alignment="bottom-0 left-0" rotate="-scale-x-100" />
      <CornerGrid alignment="top-0 right-0" rotate="-scale-y-100" />

      <div
        className="w-full h-full z-100 abs-centered radial-mask mix-blend-overlay"
        style={{ filter: "saturate(0) opacity(0.8)" }}
      >
        {isMobile ? (
          <img
            className="w-full h-full object-cover"
            src="/assets/images/antwerp-skyline.png"
            alt="Skyline"
          />
        ) : (
          <Canvas dpr={1} camera={{ position: [0, 0, 1] }}>
            <Suspense fallback={null}>
              <WavySkyline />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
};

export default Background;
