import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useGraph } from "../lib/load";
import { CanvasViewer } from "./GraphScene";
import GraphError from "./GraphError.jsx";
import ZoomControls from "./ZoomControls.jsx";
import { useLoadingSource } from "../lib/loading-context.jsx";
import { getCuratorByName } from "../lib/curators.js";

const SHOP_NODE_TYPES = ["shop", "moodboard", "item"];

const ShopDetail = () => {
  const data = useGraph();
  const params = useParams();

  const shopGraphData = useMemo(() => {
    const itemNodes = data.nodes.filter(
      (node) => node.shop === params.shopName,
    );
    const itemIds = new Set(itemNodes.map((node) => node.id));
    const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
    const moodboardIds = new Set();

    data.links.forEach((link) => {
      if (link.relationType !== "contains") return;

      const sourceId = link.source;
      const targetId = link.target;
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      if (sourceNode?.type === "moodboard" && itemIds.has(targetId)) {
        moodboardIds.add(sourceId);
      } else if (targetNode?.type === "moodboard" && itemIds.has(sourceId)) {
        moodboardIds.add(targetId);
      }
    });

    const graphItemIds = new Set(itemIds);

    data.links.forEach((link) => {
      if (link.relationType !== "contains") return;

      const sourceId = link.source;
      const targetId = link.target;
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      if (moodboardIds.has(sourceId) && targetNode?.type === "item") {
        graphItemIds.add(targetId);
      } else if (moodboardIds.has(targetId) && sourceNode?.type === "item") {
        graphItemIds.add(sourceId);
      }
    });

    const moodboardNodes = Array.from(moodboardIds)
      .map((id) => nodeById.get(id))
      .filter(Boolean);
    const graphItemNodes = Array.from(graphItemIds)
      .map((id) => nodeById.get(id))
      .filter(Boolean);

    const realShopNode = data.nodes.find(
      (n) => n.type === "shop" && n.title === params.shopName,
    );

    // The curators "behind" a shop are the people who curate the items sold there. Dedupe the item curators by name and resolve each to its persona (slug for the profile link, avatar) from curators.js; unknown names still show as a plain credit without a link.
    const curators = [
      ...new Set(itemNodes.map((node) => node.curator).filter(Boolean)),
    ].map((name) => {
      const meta = getCuratorByName(name);
      return { name, slug: meta?.slug ?? null, avatar: meta?.avatar ?? null };
    });

    const shopNode = {
      // keep a stable fake id so shopLinks (below) can reference it as source
      id: `shop-${params.shopName}`,
      idNr: 99,
      // the real facet's documentId, used as the Vault entry id so saving a shop is consistent no matter where it's saved from (falls back to a stable name-based id if the facet isn't found)
      vaultId: realShopNode?.id ?? `shop-${params.shopName}`,
      type: "shop",
      title: params.shopName,
      subtitle: realShopNode?.subtitle ?? null,
      details: realShopNode?.subtitle ?? null,
      images: realShopNode?.images ?? [],
      photo: realShopNode?.images?.[0] ?? null,
      shopType: realShopNode?.shopType ?? null,
      tags: realShopNode?.tags ?? [],
      curators,
      itemCount: itemNodes.length,
    };
    const nodes =
      itemNodes.length > 0
        ? [shopNode, ...moodboardNodes, ...graphItemNodes]
        : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const existingLinks = data.links.filter((link) => {
      const sourceId = link.source?.id || link.source;
      const targetId = link.target?.id || link.target;

      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    const shopLinks = itemNodes.map((node) => ({
      source: shopNode.id,
      target: node.id,
      relationType: "contains",
      weight: 1,
    }));

    return { nodes, links: [...existingLinks, ...shopLinks] };
  }, [data, params.shopName]);

  const [hideDetails, setHideDetails] = useOutletContext();

  // Drive the (lightweight) loader until the data is in AND the sub-graph canvas has settled. Only wait on the canvas when there's actually content to render, so an empty shop can't leave the loader stuck on.
  const [ready, setReady] = useState(false);
  const zoomApiRef = useRef(null);
  useEffect(() => setReady(false), [params.shopName]);
  const dataLoading = !data || data.nodes.length === 0;
  const hasContent = shopGraphData.nodes.length > 0;
  useLoadingSource(
    `shop-${params.shopName}`,
    dataLoading || (hasContent && !ready),
  );

  if (data.status === "error") {
    return <GraphError onRetry={data.retry} />;
  }

  if (dataLoading) {
    return null; // shared overlay covers this
  }

  return (
    <>
      <div className="absolute inset-0 z-0">
        <CanvasViewer
          graphData={shopGraphData}
          allowedNodeTypes={SHOP_NODE_TYPES}
          hideDetails={hideDetails}
          setHideDetails={setHideDetails}
          useShopLinkPhysics
          onReady={() => setReady(true)}
          zoomApiRef={zoomApiRef}
        />
      </div>
      <ZoomControls api={zoomApiRef} />
    </>
  );
};

export default ShopDetail;
