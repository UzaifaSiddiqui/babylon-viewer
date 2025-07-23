import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Vector3 } from "@babylonjs/core";

export function focusCamera(meshes, camera) {
    const valid = meshes.filter(m => m && m.getTotalVertices() > 0);
    if (!valid.length) {
        console.warn("⚠️ No valid meshes found for camera focusing");
        return;
    }
  
    console.log(`📷 Focusing camera on ${valid.length} meshes`);
    
    valid.forEach(m => m.computeWorldMatrix(true));
  
    let min = valid[0].getBoundingInfo().boundingBox.minimumWorld.clone();
    let max = valid[0].getBoundingInfo().boundingBox.maximumWorld.clone();
  
    for (let i = 1; i < valid.length; i++) {
      const box = valid[i].getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, box.minimumWorld);
      max = Vector3.Maximize(max, box.maximumWorld);
    }
  
    const bound = new BoundingInfo(min, max);
    const center = bound.boundingBox.centerWorld;
    const extent = bound.boundingBox.extendSizeWorld;
    const radius = Math.max(extent.x, extent.y, extent.z);
    
    // Handle very small models
    const minRadius = 0.1;
    const finalRadius = Math.max(radius, minRadius);
    
    camera.target = center;
    camera.radius = finalRadius * 3;
    camera.lowerRadiusLimit = finalRadius * 0.1;
    camera.upperRadiusLimit = finalRadius * 10;
    camera.minZ = finalRadius * 0.01;
    camera.maxZ = finalRadius * 50;
    

}

