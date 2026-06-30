import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import GraphScene from "./Components/GraphScene.jsx";
import { useGraph } from "./lib/load.js";
import { useCurator } from "./lib/curator-context.js";
import { useLoading, useLoadingSource } from "./lib/loading-context.jsx";
import Background from "./Components/Background.jsx";
import NoiseOverlay from "./Components/jsx-assets/NoiseOverlay.jsx";
import Intro from "./Components/Intro.jsx";
import VaultButton from "./Components/VaultButton.jsx";
import VaultDrawer from "./Components/VaultDrawer.jsx";
import SearchBar from "./Components/SearchBar.jsx";
import SearchOverlay from "./Components/SearchOverlay.jsx";
import CuratorBar from "./Components/CuratorBar.jsx";
import Loading from "./Components/Loading.jsx";
import BackButton from "./Components/BackButton.jsx";
import ZoomControls from "./Components/ZoomControls.jsx";
import GraphError from "./Components/GraphError.jsx";
import Breadcrumbs from "./Components/Breadcrumbs.jsx";
import KaratLogo from "./Components/jsx-assets/KaratLogo.jsx";
import { PerformanceMonitor } from "@react-three/drei";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const graphData = useGraph();
  const { activeCurator, curators } = useCurator();

  const [dpr, setDpr] = useState(1.5);
  const [searchOpen, setSearchOpen] = useState(false);

  const [isIntro, _setIsIntro] = useState(() => {
    return sessionStorage.getItem("introSeen") !== "true";
  });

  const setIsIntro = (value) => {
    if (!value) sessionStorage.setItem("introSeen", "true");
    _setIsIntro(value);
  };

  const [hideDetails, setHideDetails] = useState(true);
  // Zoom API published by the home canvas's GraphScene, driven by ZoomControls.
  const zoomApiRef = useRef(null);

  const onHome = location.pathname === "/";

  // The canvas (home) build is heavy — even on cached data it re-mounts the whole graph scene — so it always gets the full diamond loader. It stays up from canvas entry until BOTH the scene reports ready (GraphScene.onReady, fired when the layout settles) AND a short minimum has elapsed. The minimum is the important bit: the layout often settles in ~150ms — well before materials and nodes have actually rendered — so without it the overlay flashed off (leaving the nav over a still-building, frozen canvas) and then back on to fracture.
  // Gating on min-elapsed too makes it a single, stable show → fracture.
  const canvasEntering = onHome && !isIntro;
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasMinElapsed, setCanvasMinElapsed] = useState(false);
  useEffect(() => {
    if (!canvasEntering) return undefined;
    setCanvasReady(false);
    setCanvasMinElapsed(false);
    const t = setTimeout(() => setCanvasMinElapsed(true), 1100);
    return () => clearTimeout(t);
  }, [canvasEntering]);
  useLoadingSource(
    "canvas-build",
    canvasEntering &&
      !(canvasReady && canvasMinElapsed) &&
      graphData.status !== "error",
  );

  const { isLoading } = useLoading();

  // Keep the overlay mounted briefly after loading finishes so its diamond can play the fracture-out exit transition before it disappears. The timeout is a Hard fallback so the overlay can never get stuck on.
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const overlayShownAt = useRef(0);
  useEffect(() => {
    if (isLoading) {
      if (!overlayVisible) overlayShownAt.current = performance.now();
      setOverlayVisible(true);
      setOverlayExiting(false);
      return undefined;
    }
    if (!overlayVisible) return undefined;
    // Only long loads earn the fracture exit. A brief one just clears, so quick loads don't get a heavy transition for no reason.
    const wasLong = performance.now() - overlayShownAt.current > 1000;
    if (!wasLong) {
      setOverlayVisible(false);
      setOverlayExiting(false);
      return undefined;
    }
    setOverlayExiting(true);
    const t = setTimeout(() => {
      setOverlayVisible(false);
      setOverlayExiting(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [isLoading, overlayVisible]);

  useEffect(() => {
    if (activeCurator) {
      document.documentElement.setAttribute("data-theme", activeCurator.theme);
    }
  }, [activeCurator]);

  // Cmd/Ctrl+K opens search from anywhere as the expected shortcut for a search palette. The overlay has Escape/close itself.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const centerNodeId = useMemo(() => {
    if (!graphData || !activeCurator) return null;
    const moodboard = graphData.nodes.find(
      (n) =>
        n.type === "moodboard" && n.title === activeCurator.centerMoodboard,
    );
    return moodboard?.id ?? null;
  }, [graphData, activeCurator]);

  return (
    <>
      {isIntro ? (
        <Intro isIntro={isIntro} setIsIntro={setIsIntro} />
      ) : (
        <>
          <Background />
          {onHome ? (
            graphData.status === "error" ? (
              <GraphError onRetry={graphData.retry} />
            ) : graphData.nodes.length > 0 ? (
              <div className="absolute inset-0 z-0">
                <Canvas
                  dpr={dpr}
                  performance={{ min: 0.1 }}
                  orthographic
                  camera={{
                    zoom: 3,
                    position: [0, 0, 500],
                    near: 1,
                    far: 2000,
                  }}
                  onCreated={({ gl }) => {
                    gl.setPixelRatio(window.devicePixelRatio);
                    gl.shadowMap.enabled = false;
                  }}
                >
                  <PerformanceMonitor
                    onIncline={() => setDpr(2)}
                    onDecline={() => setDpr(1)}
                  />
                  <GraphScene
                    rawGraphData={graphData}
                    navigate={navigate}
                    hideDetails={hideDetails}
                    setHideDetails={setHideDetails}
                    centerNodeId={centerNodeId}
                    onReady={() => setCanvasReady(true)}
                    zoomApiRef={zoomApiRef}
                  />
                </Canvas>
              </div>
            ) : null
          ) : null}
          <Outlet
            key={location.pathname}
            context={[hideDetails, setHideDetails]}
          />
          {!overlayVisible && (
            <>
              <nav className="fixed top-0 w-full z-30">
                <div className="relative flex items-center justify-between gap-4 px-5 pt-4 pb-2 lg:px-10">
                  <div
                    className="absolute inset-0 -z-10 pointer-events-none"
                    style={{
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      maskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* LEFT WING: flex-1 ensures it takes up equal space as the right wing */}
                  <div className="flex flex-1 items-center gap-4">
                    <BackButton />
                    <Link to="/" className="shrink-0">
                      <KaratLogo />
                    </Link>
                  </div>

                  {/* CENTER: The Search Bar */}
                  <div className="flex justify-center w-[50vw] lg:w-[min(38vw,30rem)] shrink-0">
                    <SearchBar
                      onClick={() => setSearchOpen(true)}
                      isOpen={searchOpen}
                    />
                  </div>

                  {/* RIGHT WING: flex-1 pushes back against the left side to keep the center perfectly middle */}
                  <div className="flex flex-1 items-center justify-end gap-4 shrink-0">
                    <VaultButton />
                  </div>
                </div>
              </nav>

              <VaultDrawer />

              <CuratorBar />
              {/* {onHome && <CuratorBar />} */}
              <Breadcrumbs />

              {onHome && graphData.nodes.length > 0 && (
                <ZoomControls api={zoomApiRef} />
              )}
            </>
          )}
          {searchOpen && (
            <SearchOverlay
              nodes={graphData.nodes}
              curators={curators}
              onClose={() => setSearchOpen(false)}
            />
          )}
          {overlayVisible && (
            <Loading
              variant={onHome ? "full" : "minimal"}
              message={onHome ? "Building your canvas..." : "Loading..."}
              exiting={overlayExiting}
            />
          )}
          <NoiseOverlay />
        </>
      )}
    </>
  );
}

export default App;
