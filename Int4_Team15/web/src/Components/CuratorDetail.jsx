import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useGraph } from "../lib/load";
import { getCuratorBySlug } from "../lib/curators";
import { CanvasViewer } from "./GraphScene";
import Loading from "./Loading.jsx";
import GraphError from "./GraphError.jsx";
import ZoomControls from "./ZoomControls.jsx";
import { useLoadingSource } from "../lib/loading-context.jsx";

const CURATOR_NODE_TYPES = ["curator", "moodboard", "item"];

/*** A curator's detail page***

The ShopDetail pattern, tailored for a person: a focused sub-graph of the moodboards they curate (config in lib/curators.js) plus the items inside them, centred on a synthesised curator node. 
While the page is open, the whole canvas adopts the curator's colour theme. ***/

const CuratorDetail = () => {
  const data = useGraph();
  const params = useParams();
  const curator = getCuratorBySlug(params.slug);

  const curatorGraphData = useMemo(() => {
    if (!curator) return { nodes: [], links: [] };

    /*** The curator's moodboards, matched by title against the live graph. ***/
    const moodboardTitles = new Set(curator.moodboards);
    const moodboardNodes = data.nodes.filter(
      (n) => n.type === "moodboard" && moodboardTitles.has(n.title),
    );
    const moodboardIds = new Set(moodboardNodes.map((n) => n.id));
    const nodeById = new Map(data.nodes.map((n) => [n.id, n]));

    /*** Items those moodboards `contains` (edge endpoints are documentId strings). ***/
    const itemIds = new Set();
    data.links.forEach((link) => {
      if (link.relationType !== "contains") return;
      const s = link.source?.id || link.source;
      const t = link.target?.id || link.target;
      if (moodboardIds.has(s) && nodeById.get(t)?.type === "item") itemIds.add(t);
      else if (moodboardIds.has(t) && nodeById.get(s)?.type === "item")
        itemIds.add(s);
    });
    const itemNodes = Array.from(itemIds)
      .map((id) => nodeById.get(id))
      .filter(Boolean);

    // The synthesised centre node (idNr 99 → GraphScene pins it to the origin).
    const centerNode = {
      id: `curator-${curator.slug}`,
      idNr: 99,
      type: "curator",
      title: curator.name,
      handle: curator.handle,
      subculture: curator.subculture,
      details: curator.bio,
      antwerpTip: curator.antwerpTip ?? null,
      photo: curator.avatar,
      moodboardCount: moodboardNodes.length,
    };

    const nodes =
      moodboardNodes.length > 0
        ? [centerNode, ...moodboardNodes, ...itemNodes]
        : [];
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Keep the real moodboard→item links; add curator→moodboard links so the moodboards hang off the centre (rendered via the shop link group).
    const existingLinks = data.links.filter((link) => {
      const s = link.source?.id || link.source;
      const t = link.target?.id || link.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });
    const curatorLinks = moodboardNodes.map((mb) => ({
      source: centerNode.id,
      target: mb.id,
      relationType: "contains",
      weight: 1,
    }));

    return { nodes, links: [...existingLinks, ...curatorLinks] };
  }, [data, curator]);

  const [hideDetails, setHideDetails] = useOutletContext();

  /*** Drive the (lightweight) loader until data is in AND the sub-graph canvas has settled... BUT only wait on the canvas when there's content, so a curator with no matched moodboards can't leave the loader stuck on. ***/
  const [ready, setReady] = useState(false);
  const zoomApiRef = useRef(null);
  useEffect(() => setReady(false), [params.slug]);
  const dataLoading = !data || data.nodes.length === 0;
  const hasContent = curatorGraphData.nodes.length > 0;
  useLoadingSource(
    `curator-${params.slug}`,
    !!curator && (dataLoading || (hasContent && !ready)),
  );

  if (!curator) {
    return <Loading message={`Curator "${params.slug}" not found`} />;
  }

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
          graphData={curatorGraphData}
          allowedNodeTypes={CURATOR_NODE_TYPES}
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

export default CuratorDetail;
