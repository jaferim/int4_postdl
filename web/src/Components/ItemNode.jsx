import { useGSAP } from "@gsap/react";
import { Html, useTexture } from "@react-three/drei";
import gsap from "gsap";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import DashEllipse from "./jsx-assets/DashEllipse";
import { useThemeVar } from "../lib/themeParser";
import { useFrame } from "@react-three/fiber";
import { sizedImage } from "../lib/images";

const hazyAberrationCompile = (shader, userData) => {
  shader.uniforms.uAberration = userData.uAberration;

  shader.fragmentShader = shader.fragmentShader.replace(
    "void main() {",
    `uniform float uAberration;
    void main() {`,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    `
    #ifdef USE_MAP
      vec2 center = vec2(0.5, 0.5);
      vec2 dir = vMapUv - center;
      
      // The chromatic aberration stretch
      vec2 offset = dir * 0.09 * uAberration; 
      
      // UPGRADED: Cranked the blur radius up for a much thicker haze!
      float blur = 0.035 * uAberration; 
      
      float r = 0.0, g = 0.0, b = 0.0, a = 0.0;
      
      // A GLSL Macro to quickly sample and separate the colors 9 times
      #define TAP(uvShift) \\
        r += mix(texture2D(map, vMapUv + uvShift - offset).r, texture2D(map, vMapUv + uvShift - offset * 3.0).r, 0.55); \\
        g += texture2D(map, vMapUv + uvShift).g; \\
        b += mix(texture2D(map, vMapUv + uvShift + offset).b, texture2D(map, vMapUv + uvShift + offset * 3.0).b, 0.55); \\
        a += texture2D(map, vMapUv + uvShift).a;

      // 9-Tap Box Blur for a smooth, heavy frost effect
      TAP(vec2(0.0, 0.0))          // Center
      TAP(vec2(-blur, 0.0))        // Left
      TAP(vec2(blur, 0.0))         // Right
      TAP(vec2(0.0, -blur))        // Up
      TAP(vec2(0.0, blur))         // Down
      TAP(vec2(-blur, -blur))      // Top Left
      TAP(vec2(blur, -blur))       // Top Right
      TAP(vec2(-blur, blur))       // Bottom Left
      TAP(vec2(blur, blur))        // Bottom Right

      // Average out all 9 layers
      vec4 sampledDiffuseColor = vec4(r / 9.0, g / 9.0, b / 9.0, a / 9.0);
      
      #ifdef DECODE_VIDEO_TEXTURE
        sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb, vec3( 0.4545 ) ), sampledDiffuseColor.rgb, sampledDiffuseColor.a ), sampledDiffuseColor.a );
      #endif
      
      diffuseColor *= sampledDiffuseColor;
    #endif
    `,
  );
};

const hazyAberrationCacheKey = () => "heavy-hazy-aberration-material";

const ItemNode = ({
  node,
  dragNodeRef,
  setIsDragging,
  simulationRef,
  GlassInstance,
  ItemRingInstance,
  ItemBgInstance,
  hideDetails,
  svgScale,
  shapeGeo,
  isCat2,
  navigate,
  distanceFactor,
  images,
}) => {
  const containerY = hideDetails ? 0 : -7;
  const shardGroupRef = useRef();

  // Links directly to the WebGL shader for buttery-smooth unblurring on hover
  const materialUserData = useMemo(() => ({ uAberration: { value: 1.0 } }), []);

  const rawTexture = useTexture(
    sizedImage(node.images?.[0]) || "/assets/images/item-image.png",
  );

  const mappedTexture = useMemo(() => {
    if (!rawTexture) return null;
    const tex = rawTexture.clone();
    tex.colorSpace = rawTexture.colorSpace;
    tex.center.set(0.5, 0.5);
    tex.offset.set(0.4, 0.4);
    tex.repeat.set(1, 1);
    tex.rotation = THREE.MathUtils.degToRad(180);
    tex.needsUpdate = true;
    return tex;
  }, [rawTexture]);

  const [colorPrimary1] = useThemeVar("--color-primary-1");
  const [colorPrimary2] = useThemeVar("--color-primary-2");
  const tintColor = isCat2 ? colorPrimary2 : colorPrimary1;

  const imageRef1 = useRef(null);
  const imageRef2 = useRef(null);
  const ellipseRef = useRef(null);
  const mainGroupRef = useRef();

  const tagsContainerRef = useRef(null);
  const originalTagsRef = useRef(null);
  const scrollingWrapperRef = useRef(null);
  const cloneTagsRef = useRef(null);
  const marqueeTweenRef = useRef(null);

  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame(() => {
    if (!mainGroupRef.current) return;
    mainGroupRef.current.position.set(node.x ?? 0, node.y ?? 0, 0);
    if (mainGroupRef.current.parent) {
      mainGroupRef.current.parent.getWorldQuaternion(quaternion);
      euler.setFromQuaternion(quaternion);
      mainGroupRef.current.rotation.z = -euler.z;
    }
  });

  useGSAP(() => {
    if (hideDetails) return;

    const checkWidthAndSetupScroll = () => {
      if (!tagsContainerRef.current || !originalTagsRef.current) return;

      const containerWidth = tagsContainerRef.current.clientWidth;
      const tagsWidth = originalTagsRef.current.scrollWidth;

      if (marqueeTweenRef.current) {
        marqueeTweenRef.current.kill();
        gsap.set(scrollingWrapperRef.current, { x: 0 });
      }

      if (tagsWidth > containerWidth + 2) {
        scrollingWrapperRef.current.classList.remove(
          "w-full",
          "justify-center",
        );
        scrollingWrapperRef.current.classList.add("w-max", "gap-1.5");
        if (cloneTagsRef.current) cloneTagsRef.current.style.display = "flex";

        const singleBlockWidth = tagsWidth + 6;

        marqueeTweenRef.current = gsap.fromTo(
          scrollingWrapperRef.current,
          { x: 0 },
          {
            x: -singleBlockWidth,
            duration: singleBlockWidth * 0.03,
            ease: "none",
            repeat: -1,
            paused: true,
          },
        );
      } else {
        scrollingWrapperRef.current.classList.remove("w-max", "gap-1.5");
        scrollingWrapperRef.current.classList.add("w-full", "justify-center");
        if (cloneTagsRef.current) cloneTagsRef.current.style.display = "none";
      }
    };

    const timer = setTimeout(checkWidthAndSetupScroll, 150);
    const resizeObserver = new ResizeObserver(() =>
      requestAnimationFrame(checkWidthAndSetupScroll),
    );

    if (tagsContainerRef.current)
      resizeObserver.observe(tagsContainerRef.current);
    if (originalTagsRef.current)
      resizeObserver.observe(originalTagsRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (marqueeTweenRef.current) marqueeTweenRef.current.kill();
    };
  }, [node.tags, hideDetails]);

  const handleMouseEnter = () => {
    if (!shardGroupRef.current) return;

    if (marqueeTweenRef.current) marqueeTweenRef.current.play();

    // Fade the blur and aberration out completely
    gsap.to(materialUserData.uAberration, {
      value: 0.0,
      duration: 0.6,
      ease: "power2.out",
      overwrite: "auto",
    });

    gsap.to(shardGroupRef.current.rotation, {
      y: "+=" + Math.PI * 2,
      repeat: -1,
      ease: "none",
      duration: 8,
      overwrite: true,
    });

    gsap.to(ellipseRef.current, {
      opacity: 1,
      duration: 1,
      ease: "power2.out",
      overwrite: true,
    });

    const imageRefs = [
      { image: imageRef1.current, scale: 0.9 },
      { image: imageRef2.current, scale: 0.6 },
    ];

    imageRefs.forEach((item, index) => {
      const stagger = index * 0.15;
      gsap.to(item.image, {
        scale: item.scale,
        duration: 0.6,
        rotation: 0,
        ease: "power2.out",
        delay: stagger,
        overwrite: "auto",
      });
      gsap.to(item.image, {
        borderRadius: "0%",
        duration: 1.4,
        ease: "power2.out",
        delay: stagger,
        overwrite: "auto",
      });
    });

    window.dispatchEvent(new CustomEvent("item-hover", { detail: true }));
  };

  const handleMouseLeave = () => {
    if (!shardGroupRef.current) return;

    if (marqueeTweenRef.current) marqueeTweenRef.current.pause();

    // Fade the heavy blur and aberration back in
    gsap.to(materialUserData.uAberration, {
      value: 1.0,
      duration: 1.0,
      ease: "power2.out",
      overwrite: "auto",
    });

    gsap.to(shardGroupRef.current.rotation, {
      y: 0,
      ease: "power2.out",
      duration: 1,
      overwrite: true,
    });

    gsap.to(ellipseRef.current, {
      opacity: 0,
      duration: 1,
      ease: "power2.out",
      overwrite: true,
    });

    const imageRefs = [imageRef1.current, imageRef2.current];
    imageRefs.forEach((item, index) => {
      const stagger = index * 0.15;
      gsap.to(item, {
        scale: 0,
        duration: 0.4,
        rotation: Math.PI * 2,
        delay: stagger,
        ease: "power2.in",
        overwrite: "auto",
      });
      gsap.to(item, {
        borderRadius: "50%",
        delay: stagger,
        duration: 1.4,
        ease: "power2.in",
        overwrite: "auto",
      });
    });

    window.dispatchEvent(new CustomEvent("item-hover", { detail: false }));
  };

  useGSAP(() => {
    if (!shardGroupRef.current) return;
    if (hideDetails) {
      gsap.to(shardGroupRef.current.position, {
        ease: "power2.out",
        x: 0,
        y: -8,
      });
      gsap.to(shardGroupRef.current.scale, {
        ease: "power2.out",
        x: 1,
        y: 1,
        z: 1,
      });
    } else {
      gsap.to(shardGroupRef.current.position, {
        ease: "power2.out",
        x: 5,
        y: 16,
      });
      gsap.to(shardGroupRef.current.scale, {
        ease: "power2.out",
        x: 1.2,
        y: 1.2,
        z: 1.2,
      });
    }
  }, [hideDetails]);

  return (
    <>
      <group
        ref={mainGroupRef}
        key={node.id}
        position={[node.x ?? 0, node.y ?? 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
          dragNodeRef.current = { id: node.id, fx: node.x, fy: node.y };
          simulationRef.current?.alphaTarget(0.3).restart();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideDetails && (
          <Html
            position={[-2, containerY, -1]}
            center
            transform
            sprite
            distanceFactor={distanceFactor}
            style={{
              pointerEvents: "none",
              userSelect: "none",
              display: hideDetails ? "none" : "block",
            }}
          >
            {!hideDetails && images && (
              <div className="relative z-1">
                <img
                  ref={imageRef1}
                  className="absolute -top-19 -left-35 radial-mask aspect-square object-cover rotate-359"
                  style={{ scale: 0, borderRadius: "50%" }}
                  src={
                    sizedImage(node.images?.[0]) ||
                    "/assets/images/image-detail1.png"
                  }
                  alt="Product image"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  ref={imageRef2}
                  className="absolute scale-0 -bottom-78 -right-30 radial-mask aspect-square object-cover rotate-359"
                  style={{ scale: 0, borderRadius: "50%" }}
                  src={
                    sizedImage(node.images?.[1]) ||
                    "/assets/images/image-detail2.png"
                  }
                  alt="Product image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div
              className={`rounded-full node-circle flex-bottom flex-col group pointer-events-auto`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {!hideDetails && (
                <div className="w-[80%] flex-centered flex-col gap-2">
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      if (node.type === "item") navigate(`/${node.idNr}`);
                      else if (node.type === "shop")
                        navigate(`/shops/${encodeURIComponent(node.title)}`);
                    }}
                    className="cursor-pointer p-reg-h text-text-main opacity-70 group-hover:opacity-100 text-wrap text-center duration-300 ease-out hover:underline"
                  >
                    {node.title}
                  </p>
                  <div
                    ref={tagsContainerRef}
                    className="w-[80%] overflow-x-hidden radial-mask"
                  >
                    <div
                      ref={scrollingWrapperRef}
                      className="flex w-full justify-center"
                    >
                      <div
                        ref={originalTagsRef}
                        className="flex-centered gap-1.5 shrink-0"
                      >
                        {node.tags.map((tag) => (
                          <div className="tag-wrapper" key={tag}>
                            <div className="tag-display capitalize text-nowrap">
                              {tag}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        ref={cloneTagsRef}
                        className="flex-centered gap-1.5 shrink-0"
                        style={{ display: "none" }}
                        aria-hidden="true"
                      >
                        {node.tags.map((tag) => (
                          <div className="tag-wrapper" key={`${tag}-clone`}>
                            <div className="tag-display capitalize text-nowrap">
                              {tag}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-centered gap-2 opacity-60 group-hover:opacity-100 duration-300 ease-out w-[70%]">
                    <div className="flex-centered gap-1 shrink min-w-0">
                      <p
                        className="caption text-text-secondary hover:underline cursor-pointer capitalize truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.type === "item" && node.shop)
                            navigate(`/shops/${encodeURIComponent(node.shop)}`);
                        }}
                      >
                        {node.type === "shop" ? node.shopType : node.shop}
                      </p>
                    </div>
                    {node.price && (
                      <>
                        <div className="rounded-full w-1 h-1 bg-text-secondary"></div>
                        <p className="caption text-text-secondary">
                          €{node.price}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={ellipseRef} className="opacity-0">
              <DashEllipse scale={"scale-70"} stroke="0.8" />
            </div>
          </Html>
        )}

        <ItemBgInstance position={[-2.2, -7, -29]} />

        <group ref={shardGroupRef}>
          <mesh
            geometry={shapeGeo}
            position={[0, 0, 0]}
            scale={[svgScale, -svgScale, svgScale]}
          >
            <meshBasicMaterial
              userData={materialUserData}
              map={mappedTexture}
              color={new THREE.Color(tintColor).multiplyScalar(2)}
              side={THREE.DoubleSide}
              alphaTest={0.1}
              toneMapped={false}
              onBeforeCompile={(shader) =>
                hazyAberrationCompile(shader, materialUserData)
              }
              customProgramCacheKey={hazyAberrationCacheKey}
            />
          </mesh>
          <GlassInstance
            position={[0, 0, 0]}
            scale={[svgScale, -svgScale, svgScale]}
          />
        </group>
        <ItemRingInstance position={[-2.3, -7, -2]} scale={1.2} />
      </group>
    </>
  );
};

export default ItemNode;
