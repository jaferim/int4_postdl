import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Merged } from "@react-three/drei";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import shapes from "../data/shapes.json";
import { MaterialContext } from "./MaterialsContext";

const fixUVs = (geometry) => {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = (uv.getX(i) - min.x) / (max.x - min.x);
    const v = (uv.getY(i) - min.y) / (max.y - min.y);
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
};

export const SharedMaterialsProvider = ({ children }) => {
  const mergedRef = useRef();

  const { parsedShapes, meshes } = useMemo(() => {
    const glassMaterial1 = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.4,
      color: 0xffffff,
      clearcoat: 1,
      envMapIntensity: 3,
      side: THREE.DoubleSide,
    });

    const glassMaterial2 = glassMaterial1.clone();

    const loader = new SVGLoader();
    const extrudeSettings = {
      depth: 5,
      bevelEnabled: true,
      bevelThickness: 3,
    };

    const parsedShapes = shapes.shapes.map((shapeObj) => {
      const svgData = loader.parse(shapeObj.path);
      const customShape = svgData.paths[0].toShapes(true)[0];

      const sGeo = new THREE.ShapeGeometry(customShape);
      const eGeo = new THREE.ExtrudeGeometry(customShape, extrudeSettings);

      sGeo.center();
      eGeo.center();
      fixUVs(sGeo);
      fixUVs(eGeo);

      return { shapeGeo: sGeo, extrudeGeo: eGeo, svgScale: shapeObj.scale };
    });

    const vibeGeo = new THREE.CircleGeometry(50, 40);
    const itemRingGeo = new THREE.RingGeometry(26, 26.3, 64);
    const itemRingMaterial = new THREE.MeshBasicMaterial({
      color: "#7B7E8C",
      transparent: true,
      opacity: 0.6,
    });

    const moodGeo = new THREE.CircleGeometry(20, 35);

    const shopGeo = new THREE.CircleGeometry(120, 88);

    const itemBgGeo = new THREE.CircleGeometry(40, 64);
    const itemBgMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });
    const mList = [
      new THREE.Mesh(vibeGeo, itemBgMaterial), // Index 0
      new THREE.Mesh(itemRingGeo, itemRingMaterial), // Index 1
      new THREE.Mesh(moodGeo, itemBgMaterial), // Index 2
      new THREE.Mesh(itemBgGeo, itemBgMaterial), // Index 3 (NEW!)
      new THREE.Mesh(shopGeo, itemBgMaterial), // Index 4
    ];

    parsedShapes.forEach((s) => {
      mList.push(new THREE.Mesh(s.extrudeGeo, glassMaterial1));
      mList.push(new THREE.Mesh(s.extrudeGeo, glassMaterial2));
    });

    return { parsedShapes, meshes: mList };
  }, []);

  useEffect(() => {
    if (mergedRef.current) {
      mergedRef.current.traverse((child) => {
        if (child.isInstancedMesh) child.frustumCulled = false;
      });
    }
  }, []);

  return (
    <Merged ref={mergedRef} meshes={meshes}>
      {(...Instances) => (
        <MaterialContext.Provider value={{ parsedShapes, Instances }}>
          {children}
        </MaterialContext.Provider>
      )}
    </Merged>
  );
};
