import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Vector3 } from "@babylonjs/core";

export function focusCamera(meshes , camera) {
  if (!meshes || meshes.length === 0) return;

  const validMeshes = meshes.filter(m => m && m.getTotalVertices() > 0);
  if (validMeshes.length === 0) return;

  // ✅ Force world matrix computation
  validMeshes.forEach(m => m.computeWorldMatrix(true));

  // ✅ Start with the bounding info from the first mesh
  let boundingInfo = validMeshes[0].getBoundingInfo();
  let min = boundingInfo.boundingBox.minimumWorld.clone();
  let max = boundingInfo.boundingBox.maximumWorld.clone();

  // ✅ Union with all other bounding boxes
  for (let i = 1; i < validMeshes.length; i++) {
    const info = validMeshes[i].getBoundingInfo();
    min = Vector3.Minimize(min, info.boundingBox.minimumWorld);
    max = Vector3.Maximize(max, info.boundingBox.maximumWorld);
  }

  // ✅ Create a new bounding info for the total bounding box
  const combinedBoundingInfo = new BoundingInfo(min, max);

  const center = combinedBoundingInfo.boundingBox.centerWorld.clone();
  const extent = combinedBoundingInfo.boundingBox.extendSizeWorld;
  const radius = Math.max(extent.x, extent.y, extent.z);

  // ✅ Set camera target and distance
  camera.target = center;
  camera.lowerRadiusLimit = radius * 0.5;
  camera.upperRadiusLimit = radius * 10;
  const safeRadius = Math.max(radius, 1);
  camera.minZ = safeRadius * 0.01;
  camera.maxZ = safeRadius * 20;
}

