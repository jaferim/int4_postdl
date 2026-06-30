import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useGraph } from "../lib/load.js";
import { useParams, Link, useNavigate } from "react-router-dom";
import VaultAdd from "./jsx-assets/VaultAdd.jsx";
import { useVault } from "../lib/vault-context.js";
import { getCuratorByName } from "../lib/curators.js";
import { sizedImage } from "../lib/images";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import CanvasNode from "./CanvasNode.jsx";
import { SharedMaterialsProvider } from "./SharedMaterialsProvider.jsx";
import GraphError from "./GraphError.jsx";
import NotFound from "./NotFound.jsx";
import DetailCoachmark from "./DetailCoachmark.jsx";
import { useLoadingSource } from "../lib/loading-context.jsx";

gsap.registerPlugin(ScrollTrigger, SplitText);

// --- 1. DESKTOP COMPONENT: Circular Rings ---
const CircularNodeGroup = ({
  nodes,
  hideDetails = true,
  navigate,
  radiusFactor,
  dragAngleRef,
  direction = 1,
  ref,
}) => {
  const { viewport } = useThree();
  const radius = (viewport.height / 2) * radiusFactor;
  const innerGroupRef = useRef();

  useFrame(() => {
    if (innerGroupRef.current && dragAngleRef) {
      innerGroupRef.current.rotation.z = dragAngleRef.current * direction;
    }
  });

  return (
    <group position={[0, 0, 0]} ref={ref}>
      <group ref={innerGroupRef}>
        <mesh position={[0, 0, -30]}>
          <ringGeometry args={[radius - 0.5, radius, 128]} />
          <meshBasicMaterial
            color="#7B7E8C"
            opacity={0.3}
            transparent={true}
            depthWrite={false}
          />
        </mesh>
        {nodes.map((node, index) => {
          const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;

          const circularNode = {
            ...node,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };

          return (
            <CanvasNode
              key={circularNode.id}
              node={circularNode}
              navigate={navigate}
              distanceFactor={128}
              hideDetails={hideDetails}
              images={true}
            />
          );
        })}
      </group>
    </group>
  );
};

// --- 2. MOBILE COMPONENT: Horizontal Rows ---
const RowNodeGroup = ({
  nodes,
  hideDetails = true,
  navigate,
  yFactor,
  zStart,
  dragPanRef,
  mobileScrollProgressRef,
  ref,
}) => {
  const { viewport } = useThree();
  const innerGroupRef = useRef();

  const yPos = viewport.height * yFactor;

  useFrame(({ viewport, size }) => {
    if (innerGroupRef.current) {
      if (window.innerWidth < 1024 && mobileScrollProgressRef) {
        const padding = 20 * (viewport.width / size.width);

        const itemSpacing = 96;
        const rowWidth = (nodes.length - 1) * itemSpacing;

        const maxOffset = rowWidth / 2 - viewport.width / 2 + padding;
        const needsScroll = maxOffset > 0;

        let currentX = maxOffset;

        if (needsScroll) {
          const progress = mobileScrollProgressRef.current.value;

          const startX = yFactor > 0 ? maxOffset : -maxOffset;
          const endX = yFactor > 0 ? -maxOffset : maxOffset;

          currentX = startX + (endX - startX) * progress;
        }

        innerGroupRef.current.position.x =
          currentX + (dragPanRef ? dragPanRef.current : 0);
      } else if (dragPanRef) {
        innerGroupRef.current.position.x = dragPanRef.current;
      }
    }
  });

  return (
    <group position={[0, yPos, zStart]} ref={ref}>
      <group ref={innerGroupRef}>
        {nodes.map((node, index) => {
          const itemSpacing = 96;
          const xPos = (index - nodes.length / 2 + 0.5) * itemSpacing;

          const rowNode = {
            ...node,
            x: xPos,
            y: 0,
          };

          return (
            <CanvasNode
              key={rowNode.id}
              node={rowNode}
              navigate={navigate}
              distanceFactor={128}
              hideDetails={hideDetails}
            />
          );
        })}
      </group>
    </group>
  );
};

// Mobile-only replacement for the 3D ring browser. The canvas drag fought the DOM overlays on touch, so on phones the related items/shops become tappable cards in native scroll strips (reliable, no gesture juggling).
const MobileRelated = ({ items, shops, currentShop }) => (
  <section className="px-5 mt-4 mb-10 flex flex-col gap-10 pointer-events-auto">
    {items.length > 0 && (
      <div>
        <h2 className="p-reg-h text-text-secondary mb-3">
          MORE FROM THIS MOODBOARD
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {items.map((node) => (
            <Link
              key={node.id}
              to={`/${node.idNr}`}
              className="shrink-0 w-40 flex flex-col gap-2"
            >
              <img
                src={
                  sizedImage(node.images?.[0]) || "/assets/images/item-image.png"
                }
                alt={node.title}
                className="w-40 h-40 object-cover rounded-sm radial-mask"
                loading="lazy"
                decoding="async"
              />
              <p className="p-reg-h text-text-main line-clamp-1">{node.title}</p>
              {node.price != null && (
                <p className="p-reg-h text-text-secondary">€{node.price}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    )}
    {shops.length > 0 && (
      <div>
        <h2 className="p-reg-h text-text-secondary mb-3">SHOPS TO EXPLORE</h2>
        <div className="flex flex-col gap-2">
          {shops.map((node) => (
            <Link
              key={node.id}
              to={`/shops/${encodeURIComponent(node.title)}`}
              className="flex items-center justify-between gap-3 p-3 border border-text-main/20 rounded-sm"
            >
              <span className="p-large-h text-text-main">
                {node.title}
                {node.title === currentShop && (
                  <span className="p-reg-h text-text-secondary">
                    {" "}
                    · sells this
                  </span>
                )}
              </span>
              <span className="secondary-cta">VIEW</span>
            </Link>
          ))}
        </div>
      </div>
    )}
  </section>
);

const ItemDetail = () => {
  const [is3DReady, setIs3DReady] = useState(false);
  // True once the scroll has zoomed the camera out far enough that the related rings are actually on screen; drives the detail coachmark's hint switch.
  const [ringsVisible, setRingsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const navigate = useNavigate();

  const params = useParams();
  const data = useGraph();
  const { toggle, isSaved } = useVault();
  const nodes = data?.nodes || [];
  const curItem = nodes.find((node) => node.idNr === parseFloat(params.itemId));
  const saved = curItem ? isSaved(curItem.id) : false;
  // Data is in but the id matches nothing: a genuine 404, not a loading beat.
  const notFound = !curItem && data.status === "ready";

  /*** Show the (lightweight) loader while the item page spins up its 3D scene. *** 
  
  is3DReady flips on canvas creation, well before the user scrolls to zoom out to the rings. So that in-page beat stays loader-free as intended.

  Desktop waits for the 3D scene to boot; mobile has no canvas, so it's ready as soon as the item data is in hand. ***/
  useLoadingSource(
    `detail-${params.itemId}`,
    !notFound && (!curItem || (!is3DReady && !isMobile)),
  );

  const vaultPlusRef = useRef();
  const vaultButtonRef = useRef();

  const handleVaultClick = () => {
    toggle({
      id: curItem.id,
      idNr: curItem.idNr,
      title: curItem.title,
      type: curItem.type,
      price: curItem.price ?? null,
      shop: curItem.shop ?? null,
      image: curItem.images?.[0] ?? null,
    });
    gsap.fromTo(
      vaultPlusRef.current,
      { yPercent: 0 },
      {
        yPercent: -70,
        duration: 0.6,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
        overwrite: true,
      },
    );
    gsap.fromTo(
      vaultButtonRef.current,
      { yPercent: 0, rotate: 0 },
      {
        yPercent: -50,
        duration: 0.6,
        rotate: -2,
        repeat: 1,
        yoyo: true,
        ease: "power2.out",
        overwrite: true,
      },
      "<",
    );
  };

  const links = data?.links || [];

  /*** Inner ring = other items in the same moodboard(s) as this item; outer ring = the item's own shop first, then shops ranked by how related they are (they stock this item or its moodboard siblings). ***
  Based on ranking, rather than a blind `.slice(0, 10)` over array order. Means every shop gets surfaced instead of the same few always being cut off! ***/
  const { ringItemNodes, ringShopNodes } = useMemo(() => {
    if (!curItem) return { ringItemNodes: [], ringShopNodes: [] };
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const isContains = (l) => l.relationType === "contains";

    // Moodboards that contain this item (edge endpoints are documentId strings).
    const moodboardIds = new Set();
    for (const l of links) {
      if (!isContains(l)) continue;
      if (
        l.source === curItem.id &&
        nodeById.get(l.target)?.type === "moodboard"
      )
        moodboardIds.add(l.target);
      else if (
        l.target === curItem.id &&
        nodeById.get(l.source)?.type === "moodboard"
      )
        moodboardIds.add(l.source);
    }

    // Items those moodboards contain, i.e. the siblings.
    const siblingIds = new Set();
    for (const l of links) {
      if (!isContains(l)) continue;
      if (moodboardIds.has(l.source) && nodeById.get(l.target)?.type === "item")
        siblingIds.add(l.target);
      else if (
        moodboardIds.has(l.target) &&
        nodeById.get(l.source)?.type === "item"
      )
        siblingIds.add(l.source);
    }
    siblingIds.delete(curItem.id);

    let items = [...siblingIds].map((id) => nodeById.get(id)).filter(Boolean);
    // Fallback, so the ring is never empty for items without moodboard links.
    if (items.length === 0)
      items = nodes.filter((n) => n.type === "item" && n.id !== curItem.id);
    items = items.slice(0, 12);

    // Score shops by how many of {this item + siblings} they stock; pin the item's own shop first. Every shop stays in the (ranked) list.
    const score = new Map();
    for (const it of [curItem, ...items]) {
      if (it.shop) score.set(it.shop, (score.get(it.shop) ?? 0) + 1);
    }
    const shops = nodes
      .filter((n) => n.type === "shop")
      .map((s) => ({
        s,
        rank: (score.get(s.title) ?? 0) + (s.title === curItem.shop ? 1000 : 0),
      }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 9) // keep the 9 closest (item's shop + most related), not all
      .map((x) => x.s);

    return { ringItemNodes: items, ringShopNodes: shops };
  }, [curItem, nodes, links]);

  const shopNode = curItem
    ? nodes.find((node) => node.type === "shop" && node.title === curItem.shop)
    : null;

  const hasSpecs =
    !!curItem &&
    (curItem.material ||
      curItem.condition ||
      curItem.brand ||
      curItem.sizes?.length > 0);

  const imageContainer = useRef();
  const mainRef = useRef();
  const cameraRef = useRef();
  const groupsRef = useRef([]);
  const mainWrapperRef = useRef();
  const shopContainer = useRef();
  const windowHeight = window.innerHeight;

  const dragAngleRef = useRef(0);

  const dragPanTopRef = useRef(0);
  const dragPanBottomRef = useRef(0);
  const activeRowIndex = useRef(0);

  const mobileScrollProgressRef = useRef({ value: 0 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) return undefined; // no 3D ring canvas to drag on mobile
    let isDragging = false;
    let lastX = 0;

    const onPointerDown = (e) => {
      if (e.target.tagName === "CANVAS") {
        isDragging = true;
        lastX = e.clientX;

        if (e.clientY < window.innerHeight / 2) {
          activeRowIndex.current = 0; // Touching Top Row
        } else {
          activeRowIndex.current = 1; // Touching Bottom Row
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastX;
        dragAngleRef.current += deltaX * 0.001;

        if (activeRowIndex.current === 0) {
          dragPanTopRef.current += deltaX * 0.08;
        } else {
          dragPanBottomRef.current += deltaX * 0.08;
        }

        lastX = e.clientX;
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!curItem) return;

    const setDetailHeight = () => {
      const detailContainer = document.querySelector("#detailContainer");
      const actionContainer = document.querySelector("#actionContainer");
      if (!detailContainer || !actionContainer || !imageContainer.current)
        return;

      const detailHeight = windowHeight - imageContainer.current.offsetTop - 40;

      if (window.innerWidth < 1024) {
        detailContainer.style.height = "auto";
        actionContainer.style.height = "auto";
        return;
      }

      detailContainer.style.height = `${detailHeight}px`;
      actionContainer.style.height = `${detailHeight}px`;
    };

    setDetailHeight();
    window.addEventListener("resize", setDetailHeight);

    return () => window.removeEventListener("resize", setDetailHeight);
  }, [curItem, windowHeight]);

  const mainHeader = useRef();
  const detailContainer = useRef();
  const buttonWrapperRef = useRef();

  useGSAP(() => {
    if (
      !curItem ||
      !imageContainer.current ||
      !mainRef.current ||
      !cameraRef.current ||
      groupsRef.current.length === 0
    )
      return;

    const headerSplit = SplitText.create(mainHeader.current, {
      type: "words, lines",
      mask: "lines",
      autoSplit: true,
    });

    const tl = gsap.timeline();

    tl.from(headerSplit.lines, {
      yPercent: 200,
      duration: 1.4,
      stagger: 0.2,
      ease: "power2.out",
    })
      .from(
        imageContainer.current,
        {
          yPercent: 100,
          duration: 1.2,
          ease: "power2.out",
        },
        "-=1.2",
      )
      .from(
        shopContainer.current,
        {
          xPercent: 50,
          opacity: 0,
          scale: 0,
          rotation: 45,
          duration: 1.2,
          ease: "power2.out",
        },
        "-=0.7",
      )
      .from(
        detailContainer.current,
        {
          xPercent: 100,
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
        },
        "<=",
      )
      .from(
        buttonWrapperRef.current,
        {
          scale: 0,
          duration: 0.8,
          ease: "power2.out",
        },
        "-=0.5",
      )
      .to(
        buttonWrapperRef.current,
        {
          scale: 1,
          duration: 0.6,
          rotation: 0,
          ease: "power2.inOut",
        },
        "-=0.1",
      )
      .fromTo(
        vaultPlusRef.current,
        { yPercent: 0 },
        {
          yPercent: -70,
          duration: 0.8,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
          overwrite: true,
        },
        "<-0.8",
      )
      .fromTo(
        vaultButtonRef.current,
        { yPercent: 0, rotate: 0 },
        {
          yPercent: -50,
          duration: 0.8,
          rotate: -2,
          repeat: 1,
          yoyo: true,
          ease: "power2.inOut",
          overwrite: true,
        },
        "<",
      );
  }, [curItem, is3DReady]);

  useGSAP(() => {
    if (
      !curItem ||
      !imageContainer.current ||
      !mainRef.current ||
      !cameraRef.current ||
      groupsRef.current.length === 0
    )
      return;

    const startScrollY = window.scrollY;
    window.scrollTo(0, 0);

    let mm = gsap.matchMedia();

    // --- DESKTOP TIMELINE ---
    mm.add("(min-width: 1024px)", () => {
      const getScrollAmount = () => {
        if (!imageContainer.current) return 0;
        const figureHeight = imageContainer.current.scrollHeight;
        const availableHeight =
          window.innerHeight - (imageContainer.current.offsetTop || 0);
        const distance = figureHeight - availableHeight;
        return distance > 0 ? distance + 40 : 0;
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: mainWrapperRef.current,
          start: "top top",
          end: () => `+=${getScrollAmount() + 1000}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const v = (cameraRef.current?.zoom ?? 99) < 2.5;
            setRingsVisible((p) => (p === v ? p : v));
          },
        },
      });

      const images = imageContainer.current.querySelectorAll("img");

      tl.to(imageContainer.current, {
        y: () => -getScrollAmount(),
        ease: "none",
      })
        .to(images, { scale: 0.9, stagger: 0.1 }, "<=")
        .to(mainWrapperRef.current, { scale: 0.1 }, "-=0.3")
        .to(
          cameraRef.current,
          {
            zoom: 0.9,
            onUpdate: () => cameraRef.current.updateProjectionMatrix(),
          },
          "-=0.4",
        )
        .to(groupsRef.current[0].position, { z: 0, ease: "power2.out" }, "<=")
        .to(
          groupsRef.current[1].position,
          { z: 450, ease: "power2.out" },
          "-=0.5",
        )
        .from(groupsRef.current[0].rotation, { z: 2, ease: "power2.out" }, "<=")
        .from(
          groupsRef.current[1].rotation,
          { z: -2, ease: "power2.out" },
          "<0.1",
        );

      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", () => ScrollTrigger.refresh());
        }
      });
    });

    const getMobileScrollHeight = () => {
      const mainHeight = mainRef.current.scrollHeight;
      const distancetoScroll = windowHeight - mainHeight;
      return distancetoScroll;
    };

    // --- MOBILE TIMELINE ---
    mm.add("(max-width: 1023px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: mainWrapperRef.current,
          start: "bottom bottom",
          end: "+=2000",
          pin: true,
          // Touch devices get stuck unable to scroll when ScrollTrigger pins via position:fixed; transform-based pinning lets native touch scroll drive the timeline. Mobile-scoped (this matchMedia block only).
          pinType: "transform",
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const v = (cameraRef.current?.zoom ?? 99) < 2.5;
            setRingsVisible((p) => (p === v ? p : v));
          },
        },
      });
      tl.to(mainRef.current, {
        y: () => getMobileScrollHeight(),
      });
      tl.to(mainWrapperRef.current, {
        scale: 0.5,
        transformOrigin: "center center",
        ease: "power2.inOut",
      })
        .to(
          cameraRef.current,
          {
            zoom: 1.5,
            onUpdate: () => cameraRef.current.updateProjectionMatrix(),
          },
          "<",
        )
        .to(groupsRef.current[0].position, { z: 0, ease: "power2.out" }, "<")
        .to(groupsRef.current[1].position, { z: 0, ease: "power2.out" }, "<");

      // Appends the horizontal row transitions into the timeline layout
      tl.to(mobileScrollProgressRef.current, {
        value: 1,
        ease: "none",
      });
    });

    ScrollTrigger.refresh();

    const figureImgs = imageContainer.current
      ? Array.from(imageContainer.current.querySelectorAll("img"))
      : [];
    Promise.all(
      figureImgs.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      ),
    ).then(() => ScrollTrigger.refresh());

    if (startScrollY > 0) {
      window.scrollTo(0, startScrollY);
      const scrollProxy = { y: startScrollY };
      gsap.to(scrollProxy, {
        y: 0,
        duration: 1.2,
        ease: "power3.inOut",
        onUpdate: () => window.scrollTo(0, scrollProxy.y),
      });
    }

    return () => {
      mm.revert();
    };
  }, [curItem, is3DReady, isMobile]);

  if (data.status === "error") {
    return <GraphError onRetry={data.retry} />;
  }

  // A bad id is a genuine 404. The `/:itemId` route out-ranks the catch-all for
  // single-segment URLs, so it lands here rather than on the router's NotFound.
  if (notFound) return <NotFound title="Item not found." />;

  if (!curItem) {
    // Still loading: the shared overlay (registered above) covers this; render nothing under it.
    return null;
  }

  return (
    <>
      {/* While the 3D scene boots, the shared App-level overlay covers the screen (driven by useLoadingSource on !is3DReady above) — minimal variant, no local diamond loader needed here. */}
      {/* Desktop only: the 3D related-facet rings + scroll-pin choreography. On mobile the rings are replaced by a tappable list below (the canvas drag fought the DOM overlays on touch), so we skip the whole WebGL scene. */}
      {!isMobile && (
      <div
        className={`fixed inset-0 w-full h-full overflow-x-hidden z-0 transition-opacity duration-500`}
      >
        <Canvas onCreated={() => setIs3DReady(true)}>
          <PerspectiveCamera
            makeDefault
            ref={cameraRef}
            zoom={6}
            position={[0, 0, 800]}
            near={1}
            far={1000}
          />
          <ambientLight intensity={0.5} />
          <Environment preset="city" />

          <Suspense fallback={null}>
            <SharedMaterialsProvider>
              {isMobile
                ? [450, 450].map((config, index) => (
                    <RowNodeGroup
                      key={`row-${index}`}
                      ref={(el) => (groupsRef.current[index] = el)}
                      nodes={index === 0 ? ringItemNodes : ringShopNodes}
                      hideDetails={false}
                      navigate={navigate}
                      yFactor={index === 0 ? 0.25 : -0.25}
                      zStart={index[0]}
                      dragPanRef={
                        index === 0 ? dragPanTopRef : dragPanBottomRef
                      }
                      mobileScrollProgressRef={mobileScrollProgressRef}
                    />
                  ))
                : [0, 450].map((zPos, index) => (
                    <CircularNodeGroup
                      key={`ring-${index}`}
                      ref={(el) => (groupsRef.current[index] = el)}
                      nodes={index === 0 ? ringItemNodes : ringShopNodes}
                      hideDetails={false}
                      navigate={navigate}
                      radiusFactor={0.5}
                      dragAngleRef={dragAngleRef}
                      direction={index === 0 ? 1 : -1}
                    />
                  ))}
            </SharedMaterialsProvider>
          </Suspense>
        </Canvas>
      </div>
      )}
      <div
        className={
          isMobile
            ? "w-full min-h-screen pb-16"
            : `overflow-hidden h-screen lg:h-screen w-full transition-opacity duration-500 ${
                !is3DReady ? "opacity-0 pointer-events-none" : "opacity-100"
              }`
        }
        ref={mainWrapperRef}
      >
        <main
          ref={mainRef}
          id="main"
          className="w-full overflow-x-hidden lg:overflow-hidden relative z-10 pointer-events-none"
        >
          <article className="mt-24 pointer-events-none">
            <h1
              ref={mainHeader}
              className="mix-blend-difference main-header lg:max-w-[60%] ml-5 mr-5 lg:ml-10 relative z-20 pointer-events-auto w-fit"
            >
              {curItem.title}
            </h1>
            <div className="flex flex-col p-5 lg:py-0 lg:pl-10 lg:pr-0 lg:flex-row items-start gap-y-4 lg:gap-x-10 lg:-mt-12">
              <aside
                className="w-full lg:w-[20%] shrink-0 lg:order-0 flex flex-col lg:justify-end pointer-events-auto order-last mt-8 lg:mt-0 mb-4 lg:mb-0"
                id="actionContainer"
              >
                {curItem.shop && (
                  <div
                    className="flex flex-col gap-3 p-3 lg:p-5 lg:bg-primary-5 bg-primary-1/5 border-text-main/30 border-[0.6px] rounded-sm"
                    ref={shopContainer}
                  >
                    <img
                      className="w-full aspect-video radial-mask object-cover"
                      src={
                        shopNode?.images?.[0] || "/assets/images/shop-photo.png"
                      }
                      alt={curItem.shop}
                      loading="lazy"
                      decoding="async"
                    />
                    <h3 className="p-large-h text-text-main">{curItem.shop}</h3>
                    <p className="p-reg text-text-secondary line-clamp-4">
                      {shopNode?.subtitle ||
                        `${curItem.shop} — view the store for more.`}
                    </p>
                    <Link
                      to={`/shops/${encodeURIComponent(curItem.shop)}`}
                      className="self-end mt-1"
                    >
                      <p className="secondary-cta">VIEW STORE</p>
                    </Link>
                  </div>
                )}
              </aside>
              <figure
                className="overflow-x-auto lg:w-[35%] flex items-end lg:flex-col gap-4 relative z-0 radial-mask pointer-events-auto"
                ref={imageContainer}
              >
                {curItem.images?.length > 0 ? (
                  curItem.images.map((src, i) => (
                    <img
                      key={i}
                      className="aspect-3/2 lg:w-full h-auto lg:aspect-auto object-cover shrink-0"
                      src={src}
                      alt={`${curItem.title} ${i + 1}`}
                    />
                  ))
                ) : (
                  <>
                    <img
                      className="aspect-3/2 lg:w-full h-auto lg:aspect-auto object-cover shrink-0"
                      src="/assets/images/image-detail3.png"
                      alt=""
                    />
                    <img
                      className="aspect-3/2 lg:w-full h-auto lg:aspect-auto object-cover shrink-0"
                      src="/assets/images/image-detail2.png"
                      alt=""
                    />
                    <img
                      className="aspect-3/2 lg:w-full h-auto lg:aspect-auto object-cover shrink-0"
                      src="/assets/images/image-detail1.png"
                      alt=""
                    />
                  </>
                )}
              </figure>
              <section
                className="lg:pb-10 lg:pr-10 w-full lg:w-[38%] 2xl:w-[35%] lg:max-w-196 flex flex-col lg:mb-28 lg:ml-auto pointer-events-auto"
                id="detailContainer"
                ref={detailContainer}
              >
                <div className="flex flex-col gap-y-10 lg:gap-y-12">
                  <section>
                    <h2 className="p-reg-h text-text-secondary mb-2">
                      DESCRIPTION
                    </h2>
                    <p className="p-large text-text-main sm:max-w-[60%] lg:max-w-full">
                      {curItem.subtitle ||
                        "No description available for this piece yet."}
                    </p>
                  </section>

                  <section className="flex flex-row items-start justify-between gap-x-10">
                    {curItem.curator &&
                      (() => {
                        const curatorMeta = getCuratorByName(curItem.curator);
                        const credit = (
                          <div className="flex gap-2 items-center">
                            {curatorMeta?.avatar ? (
                              <img
                                src={curatorMeta.avatar}
                                alt={curItem.curator}
                                className="profile-pics object-cover"
                              />
                            ) : (
                              <div className="profile-pics"></div>
                            )}
                            <p className="p-reg-h text-text-main whitespace-nowrap">
                              {curItem.curator}
                            </p>
                          </div>
                        );
                        return (
                          <div>
                            <p className="p-reg-h text-text-secondary mb-2 lg:mb-3">
                              Curated by
                            </p>
                            {curatorMeta ? (
                              <Link
                                to={`/curators/${curatorMeta.slug}`}
                                className="hover:underline pointer-events-auto"
                              >
                                {credit}
                              </Link>
                            ) : (
                              credit
                            )}
                          </div>
                        );
                      })()}

                    {curItem.price != null && (
                      <div>
                        <h5 className="text-text-main">€{curItem.price}</h5>
                        <p className="p-reg-h text-text-secondary capitalize">
                          {curItem.availability
                            ? curItem.availability.replace(/_/g, " ")
                            : "In store"}
                        </p>
                      </div>
                    )}
                  </section>

                  {hasSpecs && (
                    <dl className="flex flex-col gap-3 w-full">
                      {curItem.material && (
                        <>
                          <div className="flex justify-between items-center gap-8">
                            <dt className="p-reg-h text-text-secondary">
                              Material:
                            </dt>
                            <dd className="p-reg-h text-text-main">
                              {curItem.material}
                            </dd>
                          </div>
                          <hr />
                        </>
                      )}
                      {curItem.condition && (
                        <>
                          <div className="flex justify-between items-center gap-8">
                            <dt className="p-reg-h text-text-secondary">
                              Condition:
                            </dt>
                            <dd className="p-reg-h text-text-main">
                              {curItem.condition}
                            </dd>
                          </div>
                          <hr />
                        </>
                      )}
                      {curItem.brand && (
                        <>
                          <div className="flex justify-between items-center gap-8">
                            <dt className="p-reg-h text-text-secondary">
                              Brand:
                            </dt>
                            <dd className="p-reg-h text-text-main">
                              {curItem.brand}
                            </dd>
                          </div>
                          <hr />
                        </>
                      )}
                      {curItem.sizes?.length > 0 && (
                        <>
                          <div className="flex justify-between items-center gap-8">
                            <dt className="p-reg-h text-text-secondary">
                              Sizes:
                            </dt>
                            <dd className="flex gap-1">
                              {curItem.sizes.map((size, index) => (
                                <div key={index} className="size-box">
                                  {size}
                                </div>
                              ))}
                            </dd>
                          </div>
                          <hr />
                        </>
                      )}
                    </dl>
                  )}
                </div>

                <div className="flex justify-between flex-row-reverse gap-x-8 items-end gap-y-8 mt-10 lg:mt-12">
                  <button
                    type="button"
                    onClick={handleVaultClick}
                    ref={buttonWrapperRef}
                    aria-pressed={saved}
                    className={`add-button cursor-pointer w-fit ${saved ? "opacity-50" : ""} ${isMobile ? "" : "scale-150 rotate-15"}`}
                  >
                    <div className="add-button-icon">
                      <VaultAdd
                        plusRef={vaultPlusRef}
                        buttonRef={vaultButtonRef}
                        className="w-8 lg:w-10 h-auto lg:h-12"
                        saved={saved}
                      />
                    </div>
                    <div className="px-3">
                      <p className="p-large-h whitespace-nowrap text-primary-2 capitalize">
                        {saved ? "Remove from Vault" : "Add to Vault!"}
                      </p>
                    </div>
                  </button>
                  {curItem.tags?.length > 0 && (
                    <section className="group">
                      <h2 className="p-reg-h text-text-secondary mb-3">TAGS</h2>
                      <div className="flex flex-wrap gap-2">
                        {curItem.tags.map((tag, index) => (
                          <div className="tag-wrapper" key={index}>
                            <div className="tag-display uppercase text-nowrap p-reg-h">
                              {tag}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </section>
            </div>
          </article>
          {isMobile && (
            <MobileRelated
              items={ringItemNodes}
              shops={ringShopNodes.slice(0, 5)}
              currentShop={curItem.shop}
            />
          )}
        </main>
      </div>
      {!isMobile && <DetailCoachmark ringsVisible={ringsVisible} />}
    </>
  );
};

export default ItemDetail;
