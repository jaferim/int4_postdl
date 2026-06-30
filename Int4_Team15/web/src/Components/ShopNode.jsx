import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import DashEllipse from "./jsx-assets/DashEllipse";
import VaultAdd from "./jsx-assets/VaultAdd.jsx";
import { sizedImage } from "../lib/images";
import { mapUrlFor } from "../lib/maps";
import { useVault } from "../lib/vault-context.js";

// A single round curator avatar (image, or an empty placeholder when we have no photo for them). The black ring is what cuts overlapping avatars apart in the "recommended by" stack against the dark circle.
const CuratorAvatar = ({ curator, ring = false }) =>
  curator.avatar ? (
    <img
      src={curator.avatar}
      alt={curator.name}
      className={`profile-pics object-cover${ring ? " ring-2 ring-black" : ""}`}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className={`profile-pics block${ring ? " ring-2 ring-black" : ""}`} />
  );

// The central shop circle is sized for desktop (w-180); on a narrow phone it overflows the screen and gets cut off. Scale the whole node down on mobile via the Html distanceFactor so it fits and stays grabbbbababable.
const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

// Small inline map-pin for the directions link, kept local like the rest of the node's decorative SVGs.
const MapPinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ShopNode = ({
  node,
  setIsDragging,
  dragNodeRef,
  simulationRef,
  ShopInstance,
}) => {
  // Drive position imperatively from the live (d3-mutated) node each frame so the simulation never needs a React re-render to move this node. See GraphScene for the structure-published-once pattern this relies on.
  const groupRef = useRef();
  // The "recommended by" avatar stack expands to the full curator list on tap, like Instagram's "liked by".
  const [curatorsOpen, setCuratorsOpen] = useState(false);
  const curators = node.curators ?? [];

  // Long shop names ("Dries Van Noten – Het Modepaleis") blow past the circle at the default h3 size, pushing the buttons outside it. Step the heading down by name length so it always fits. Most shops are short and keep the full size.
  const nameLen = node.title?.length ?? 0;
  const titleSize =
    nameLen <= 18 ? "text-3xl" : nameLen <= 25 ? "text-2xl" : "text-2xl";

  // Shops are savable to the Vault just like items (the drawer already handles shop-type entries). Keyed by the real facet documentId so a shop reads as saved no matter where it was added from.
  const { toggle, isSaved } = useVault();
  const saved = isSaved(node.vaultId);
  const handleVaultClick = (e) => {
    e.stopPropagation();
    toggle({
      id: node.vaultId,
      idNr: node.idNr,
      title: node.title,
      type: "shop",
      price: null,
      // a shop has no parent shop; leave it null so the drawer doesn't print the name twice (the drawer falls back to the title for navigation)
      shop: null,
      shopType: node.shopType ?? null,
      image: node.photo ?? null,
    });
  };
  const extraCount = curators.length - 1;
  const recLabel =
    curators.length === 1
      ? curators[0].name
      : `${curators[0]?.name} and ${extraCount} other${extraCount > 1 ? "s" : ""}`;
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
        <div className="shop-circle p-18 lg:p-32 flex items-center relative">
          <div className="shop-circle-surface" />
          <div className="relative z-10 flex flex-col gap-4 lg:gap-8">
            <div className="flex flex-col gap-2 lg:gap-3">
              <div>
                {node.shopType && (
                  <p className="caption text-text-secondary mb-1 capitalize">
                    {node.shopType.replace(/_/g, " ")}
                  </p>
                )}
                <h3 className={`text-wrap text-text-main ${titleSize}`}>
                  {node.title}
                </h3>
              </div>
              <a
                href={mapUrlFor(node.title)}
                target="_blank"
                rel="noreferrer"
                title={`Open directions to ${node.title} in Maps`}
                className="caption uppercase text-primary-2 no-underline hover:underline active:underline inline-flex items-center gap-1 w-fit pointer-events-auto cursor-pointer"
              >
                <MapPinIcon />
                Get directions
              </a>
            </div>
            {node.details && (
              <p className="p-reg text-text-main">{node.details}</p>
            )}
            {node.tags?.length > 0 && (
              <div className="w-full flex flex-wrap gap-2 group">
                {node.tags.map((tag) => (
                  <div key={tag} className="tag-wrapper">
                    <div className="tag-display capitalize text-nowrap">
                      {tag}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {curators.length > 0 && (
              <div className="w-full flex flex-col items-start gap-2 pointer-events-auto relative">
                <p className="caption text-text-secondary">Recommended by</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCuratorsOpen((open) => !open);
                  }}
                  aria-expanded={curatorsOpen}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex items-center">
                    {curators.slice(0, 3).map((curator, i) => (
                      <span
                        key={curator.name}
                        className={i > 0 ? "-ml-3" : ""}
                        style={{ zIndex: 3 - i }}
                      >
                        <CuratorAvatar curator={curator} ring />
                      </span>
                    ))}
                  </div>
                  <p className="p-reg-h text-text-main whitespace-nowrap">
                    {recLabel}
                  </p>
                </button>
                {/* Tap-to-expand list, like Instagram's "liked by". HashRouter
                    app, so plain hash anchors navigate to each profile without
                    router hooks inside the canvas-portalled Html. */}
                {curatorsOpen && (
                  <div className="absolute top-full left-0 mt-2 z-30 flex flex-col gap-1 rounded-lg border border-text-secondary/40 bg-normalbg p-2 min-w-[12rem]">
                    {curators.map((curator) => {
                      const row = (
                        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-text-secondary/15 transition-colors">
                          <CuratorAvatar curator={curator} />
                          <span className="p-reg-h text-text-main whitespace-nowrap">
                            {curator.name}
                          </span>
                        </div>
                      );
                      return curator.slug ? (
                        <a
                          key={curator.name}
                          href={`#/curators/${curator.slug}`}
                          className="block"
                        >
                          {row}
                        </a>
                      ) : (
                        <div key={curator.name}>{row}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleVaultClick}
              aria-pressed={saved}
              className={`add-button cursor-pointer w-fit mt-1 pointer-events-auto ${saved ? "opacity-50" : ""}`}
            >
              <div className="add-button-icon">
                <VaultAdd className="w-6 lg:w-8 h-auto" saved={saved} />
              </div>
              <div className="px-3">
                <p className="p-reg-h whitespace-nowrap text-primary-2 capitalize">
                  {saved ? "Remove from Vault" : "Add to Vault!"}
                </p>
              </div>
            </button>
          </div>
          <DashEllipse scale={"scale-190 lg:scale-260"} />
          {node.photo && (
            <div className="-bottom-24 -right-24 z-20 absolute rounded-full w-90 h-90 lg:w-100 lg:h-100 p-20">
              <img
                className="rounded-full object-cover opacity-50 w-full h-auto aspect-square"
                src={sizedImage(node.photo)}
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

export default ShopNode;
