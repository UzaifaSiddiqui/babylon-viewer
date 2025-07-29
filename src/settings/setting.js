console.log("Settings Work");
import {
    Engine,
    Scene,
    Vector3,
    Color3,
    Color4,
    StandardMaterial,
    PBRMaterial,
    SceneLoader,
    Texture,
    DynamicTexture,
    Effect,
    ShaderMaterial,
    MeshBuilder,
    PointsCloudSystem,
    VertexBuffer
} from "@babylonjs/core";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(1, 1, 1, 1);

const meshList = [];
const originalMaterials = [];
const wireframeClones = []; 
const NormalMapMeshList = [];
const UVCheckerMeshList = [];
const EmissiveMapMeshList = [];
const untexturedMeshes =[];
const roughnessMapMeshList = [];
const metalMapMeshList = [];
const matcapMeshList = [];


let flags = {
    hasAlbedo: false,
    hasNormal: false,
    hasRoughness: false,
    hasMetallic: false,
    hasAO: false,
    hasEmissive: false
};

function applyRenderFixes(shaderMaterial) {
  shaderMaterial.forceDepthWrite = true;
  shaderMaterial.zOffset = -1;
  shaderMaterial.backFaceCulling = false;
}

export function checkAnyTextures(scene,flag) {
  
    for (const mesh of scene.meshes) {
      const mat = mesh.material;
      if (!mat) continue;
  
      if (mat.albedoTexture || mat.diffuseTexture) flags.hasAlbedo = true;
      if (mat.bumpTexture) flags.hasNormal = true;
      if (mat.roughnessTexture) flags.hasRoughness = true;
      if (mat.metallicTexture) flags.hasMetallic = true;
      if (mat.ambientTexture) flags.hasAO = true;
      if (mat.emissiveTexture) flags.hasEmissive = true;
  
      // ✅ Exit early if all textures are found
      if (Object.values(flags).every(Boolean)) break;
    }
  
    console.log("🧪 Texture Summary:", flags);
    return flags;
}


function clearSceneMeshes() {
    [...meshList, ...wireframeClones, ...standardMaterialsMeshList].forEach(mesh => {
      console.log("getting disposed");
      console.log(mesh.name);
      mesh.dispose();
    });
    meshList.length = 0;
    wireframeClones.length = 0;
    standardMaterialsMeshList.length = 0;
    originalMaterials.length = 0;
    NormalMapMeshList.length = 0;
    metalMapMeshList.length = 0;
    EmissiveMapMeshList.length = 0;
    UVCheckerMeshList.length = 0;
    roughnessMapMeshList.length = 0;
    matcapMeshList.length = 0;
    matcapSurfaceMeshList.length = 0;
    baseColorMeshList.length = 0;
}


/* let vertexCloud = null;

function showVertices(meshes, scene) {
  if (vertexCloud) {
    vertexCloud.dispose();
    vertexCloud = null;
  }

  const pcs = new PointsCloudSystem("vertexPoints", 1, scene);

  let globalIndex = 0;

  meshes.forEach(mesh => {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;

    const transform = mesh.getWorldMatrix();
    const vertexCount = positions.length / 3;

    const localPositions = [];

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const pos = new Vector3(
        positions[idx],
        positions[idx + 1],
        positions[idx + 2]
      );
      const worldPos = Vector3.TransformCoordinates(pos, transform);
      localPositions.push(worldPos);
    }

    pcs.addPoints(vertexCount, (particle, i) => {
      const localIndex = i - globalIndex;
      if (localIndex >= 0 && localIndex < localPositions.length) {
        particle.position.copyFrom(localPositions[localIndex]);
      }
    });

    globalIndex += vertexCount;
  });

  pcs.buildMeshAsync().then(() => {
    vertexCloud = pcs.mesh;
    vertexCloud.isPickable = false;
    vertexCloud.name = "vertexCloud";

    const mat = new StandardMaterial("vertexMat", scene);
    mat.emissiveColor = new Color3(1, 0, 0); // red
    mat.disableLighting = true;
    mat.pointsCloud = true;
    mat.pointSize = 5; // ← Increase size to be sure it's visible
    vertexCloud.material = mat;

    console.log("✅ Vertex cloud shown");
  });
}


const showVerticesBtn = document.getElementById("showVerticesBtn");
let verticesShown = false;

showVerticesBtn.addEventListener("click", () => {
  if (!verticesShown) {
    // 🔧 Force skeleton update before capturing vertex positions
    meshList.forEach(mesh => {
      if (mesh.skeleton) {
        const baked = mesh.clone(mesh.name + "_baked", null, true); // deep clone with skeleton
        baked.convertToUnIndexedMesh();
        baked.bakeCurrentTransformIntoVertices();
        baked.skeleton = null; // Detach skeleton after bake
        showVertices([baked], scene);
        baked.dispose(); // Clean up after showing
      } else {
        showVertices([mesh], scene);
      }
    });

    showVertices(meshList, scene);  // Then compute vertex world positions
    verticesShown = true;
    showVerticesBtn.textContent = "Hide Vertices";
  } else {
    if (vertexCloud) {
      vertexCloud.dispose();
      vertexCloud = null;
    }
    verticesShown = false;
    showVerticesBtn.textContent = "Show Vertices";
  }
}); */

// wireframe application
let wireframeMaterial; 
function createWireframeClone(originalMesh) {
 const wireMesh = originalMesh.clone(originalMesh.name + "_wire");

 if (!wireMesh) return;

 if (!wireframeMaterial) {
   wireframeMaterial = new StandardMaterial("wireMat", scene);
   wireframeMaterial.diffuseColor = Color3.FromHexString("#ffffff"); // default white
   wireframeMaterial.wireframe = true;
   wireframeMaterial.backFaceCulling = false;
 }

 wireMesh.material = wireframeMaterial;
 wireMesh.isPickable = false;
 wireMesh.visibility = 0; // start hidden

 wireframeClones.push(wireMesh);
}

const toggleBtn = document.getElementById("toggleWireframe");
let wireframeEnabled = false;

toggleBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));
    if (!wireframeEnabled) {
      meshList.forEach(mesh=>{
        createWireframeClone(mesh);
      })
      wireframeClones.forEach(clone => {
        clone.visibility =1;
      })
      wireframeEnabled = true;
    } else {
      wireframeClones.forEach(clone =>{
        clone.visibility = 0;
        clone.dispose();
      })
      wireframeClones.length = 0;
      wireframeEnabled = false;
    }
  });
  
  function toggleWireframe(val) {
    wireframeClones.forEach(clone => {
      clone.visibility = val;
    });
  }

  document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const color = e.target.getAttribute("data-color");
      if (wireframeMaterial) {
        let val = 1;
        toggleWireframe(val);
        wireframeMaterial.diffuseColor = Color3.FromHexString(color);
      }
    });
  });
  


// uv checker

function createUVCheckerClone(originalMesh) {
  const uvClone = originalMesh.clone(originalMesh.name + "_uvChecker");
 
  if (!uvClone || !originalMesh.material) {
   console.log("shit is not working");  
   return
 };
 
   console.log("shit is working!");
 
  const uvMat = new StandardMaterial("uvMat_" + originalMesh.name, scene);
  uvMat.diffuseTexture = new Texture(
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/uv_grid_opengl.jpg",
    scene
  );
  uvMat.backFaceCulling = false;
  uvClone.material = uvMat;
 
  uvClone.isPickable = false;
  uvClone.visibility = 0;
 
  UVCheckerMeshList.push(uvClone);
 }

let uvToggleBtn = document.getElementById("toggleUVChecker");
let uvCheckerEnabled = false;

uvToggleBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));
  if (!uvCheckerEnabled) {
    console.log("✅ UV toggle ON");

    // Hide original model
    meshList.forEach(m => m.visibility = 0);

    // If already created, just show
    if (UVCheckerMeshList.length > 0) {
      UVCheckerMeshList.forEach(m => m.visibility = 1);
    } else {
      // First-time creation
      meshList.forEach(mesh => {
        createUVCheckerClone(mesh);
      });
      UVCheckerMeshList.forEach(m => m.visibility = 1);
    }

    uvCheckerEnabled = true;
  } else {
    console.log("🚫 UV toggle OFF");

    // Hide all UV checker clones
    UVCheckerMeshList.forEach(m => m.visibility = 0);

    // Show original model again
    meshList.forEach(m => m.visibility = 1);

    uvCheckerEnabled = false;
  }
});


//Normal Texture
function createNormalMapPreviewClone(originalMesh) {
  if (!originalMesh) return;

  const previewClone = originalMesh.clone(originalMesh.name + "_normalPreview");
  if (!previewClone) return;

  let previewMat;

  // Try to find normal texture
  const mat = originalMesh.material;
  const normalTexture = mat?.normalTexture || (mat instanceof PBRMaterial && mat.bumpTexture);

  if (normalTexture) {
    previewMat = new StandardMaterial("normalPreviewMat_" + originalMesh.name, scene);
    previewMat.diffuseTexture = normalTexture;
  } else {
    console.warn("⚠️ No normal texture for", originalMesh.name, "- using fallback");
    previewMat = new StandardMaterial("fallbackNormalMat_" + originalMesh.name, scene);
    previewMat.diffuseColor = new Color3(0, 0, 0); // flat blue normal map color
  }

  previewMat.emissiveColor = Color3.White();
  previewMat.disableLighting = true;
  previewMat.backFaceCulling = false;

  previewClone.material = previewMat;
  previewClone.visibility = 0;
  previewClone.setEnabled(false);
  previewClone.isPickable = false;
  previewClone.computeWorldMatrix(true);

  NormalMapMeshList.push(previewClone);
}


const createNormalLitCloneBtn = document.getElementById("createNormalLitClone");
let normalPreviewEnabled = false;

createNormalLitCloneBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));

  if (!normalPreviewEnabled) {
    // Create clones only once
    if (NormalMapMeshList.length === 0) {
      meshList.forEach(mesh => createNormalMapPreviewClone(mesh));
    }

    meshList.forEach(mesh => mesh.visibility = 0);
    NormalMapMeshList.forEach(clone => {
      clone.visibility = 1;
      clone.setEnabled(true);
    });

    normalPreviewEnabled = true;
    toggleNormalBtn.textContent = "Hide Normal Preview";
  } else {
    NormalMapMeshList.forEach(clone => {
      clone.visibility = 0;
      clone.setEnabled(false);
    });

    meshList.forEach(mesh => mesh.visibility = 1);
    normalPreviewEnabled = false;
    toggleNormalBtn.textContent = "Show Normal Preview";
  }
});
//emissive texture

function createEmissiveShadedClone(originalMesh) {
  if (!originalMesh || !originalMesh.material) return;

  const emissiveTexture = originalMesh.material.emissiveTexture;
  if (!emissiveTexture) {
    console.warn("⚠️ No emissive texture for", originalMesh.name);
    return;
  }

  const emissiveClone = originalMesh.clone(originalMesh.name + "_emissiveShaded");
  if (!emissiveClone) return;

  // Clone or reuse texture
  const clonedEmissiveTex = emissiveTexture.clone(); // ✅ clone() is safer than relying on .url
  clonedEmissiveTex.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
  clonedEmissiveTex.gammaSpace = false;
  clonedEmissiveTex.wrapU = Texture.CLAMP_ADDRESSMODE;
  clonedEmissiveTex.wrapV = Texture.CLAMP_ADDRESSMODE;
  clonedEmissiveTex.name = "ClonedEmissive_" + originalMesh.name;

  const pbr = new PBRMaterial("emissiveShaded_" + originalMesh.name, scene);
  pbr.albedoColor = new Color3(0, 0, 0);
  pbr.emissiveTexture = clonedEmissiveTex;
  pbr.emissiveColor = new Color3(10, 10, 10); // Brighter for test
  pbr.emissiveIntensity = 1.5;
  pbr.metallic = 0;
  pbr.roughness = 1;
  pbr.backFaceCulling = false;
  pbr.usePhysicalLightFalloff = false;
  pbr.disableLighting = false;
  pbr.forceDepthWrite = true;
  pbr.zOffset = -1;
  pbr.renderingGroupId = 1;

  emissiveClone.material = pbr;
  emissiveClone.isPickable = false;
  emissiveClone.visibility = 0;
  emissiveClone.receiveShadows = false;
  emissiveClone.computeWorldMatrix(true);
  emissiveClone.setEnabled(true);

  EmissiveMapMeshList.push(emissiveClone);
}

const toggleEmissiveBtn = document.getElementById("toggleEmissive");
let emissiveMapEnabled = false; 


toggleEmissiveBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));

  if (!emissiveMapEnabled) {
    console.log("🌟 Enabling emissive map preview...");
    meshList.forEach(mesh => {
      createEmissiveShadedClone(mesh);
      mesh.visibility = 0;
    });

    EmissiveMapMeshList.forEach(clone => {
      clone.visibility = 1;
      clone.setEnabled(true);
    });

    emissiveMapEnabled = true;
  } else {
    console.log("🧹 Disabling emissive preview and cleaning up...");
    EmissiveMapMeshList.forEach(clone => {
      if (clone.material?.emissiveTexture) {
        clone.material.emissiveTexture.dispose();
      }
      clone.material?.dispose();
      clone.dispose();
    });

    EmissiveMapMeshList.length = 0;

    meshList.forEach(mesh => {
      mesh.visibility = 1;
      mesh.setEnabled(true);
    });

    emissiveMapEnabled = false;
  }
});

//roughness texture
 //Creating Custom Shader To Preview Roughness By Getting The Green Channel That Is Responsible For Roughness
 Effect.ShadersStore["roughnessVertexShader"] = `
 precision highp float;
 attribute vec3 position;
 attribute vec2 uv;
 uniform mat4 worldViewProjection;
 varying vec2 vUV;
 void main() {
   vUV = uv;
   gl_Position = worldViewProjection * vec4(position, 1.0);
 }`;

 Effect.ShadersStore["roughnessFragmentShader"] = `
 precision highp float;
 varying vec2 vUV;
 uniform sampler2D textureSampler;
 void main() {
   vec4 texColor = texture2D(textureSampler, vUV);
   float roughness = pow(texColor.g, 1.5);
   gl_FragColor = vec4(vec3(roughness), 1.0);
 }`;

function createRoughnessPreviewClone(originalMesh) {
    const roughClone = originalMesh.clone(originalMesh.name + "_roughnessPreview");
    if (!roughClone || !originalMesh.material) return;
  
    const originalMat = originalMesh.material;
    const metallicTexture = originalMat instanceof PBRMaterial ? originalMat.metallicTexture : null;
  
    if (!metallicTexture) return;
  
    const roughnessShader = new ShaderMaterial("roughnessView", scene, {
      vertex: "roughness",
      fragment: "roughness"
    }, {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection"],
      samplers: ["textureSampler"]
    });
  
    applyRenderFixes(roughnessShader);
  
    metallicTexture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
    metallicTexture.gammaSpace = false;
    roughnessShader.setTexture("textureSampler", metallicTexture);
  
    roughClone.material = roughnessShader;
    roughClone.isPickable = false;
    roughClone.visibility = 0;
    roughClone.computeWorldMatrix(true);
  
    roughnessMapMeshList.push(roughClone);
}
   

  //Texture Panel
  document.getElementById("toggleTexturePanel").addEventListener("click", () => {
    const texturePanel = document.getElementById("texturePanel");
    if (texturePanel) {
      texturePanel.classList.toggle("active");
    }
  });

const toggleRoughnessBtn = document.getElementById("toggleRoughness");
let roughnessEnabled = false;

toggleRoughnessBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));
    if (!roughnessEnabled) {
      meshList.forEach(mesh =>{
        createRoughnessPreviewClone(mesh);
        mesh.visibility = 0;
      });
      roughnessMapMeshList.forEach(clone =>{
        clone.visibility = 1
      })
      roughnessEnabled = true;
      return;
    }
    else{
        roughnessMapMeshList.forEach(clone => {
            clone.visibility = 0;
            clone.dispose();
        });
        roughnessMapMeshList.length = 0;
        meshList.forEach(mesh=>{
            mesh.visibility=1;
        })
        roughnessEnabled = false;
    }

});

// metalness texture

/* function createMetalRoughClone(originalMesh) {
  if (!originalMesh || !originalMesh.material) return;

  const originalMat = originalMesh.material;
  const metallicTex = originalMat instanceof PBRMaterial ? originalMat.metallicTexture : null;
  if (!metallicTex) {
    console.warn("⚠️ No metallic texture found for", originalMesh.name);
    return;
  }

  const metalClone = originalMesh.clone(originalMesh.name + "_metalClone");
  if (!metalClone) return;

  // ✅ Create a clean, isolated clone of the texture
  const clonedMetalTex = new Texture(metallicTex.url, scene, false, false);
  clonedMetalTex.name = "ClonedMetal_" + originalMesh.name;
  clonedMetalTex.gammaSpace = false;
  clonedMetalTex.wrapU = Texture.CLAMP_ADDRESSMODE;
  clonedMetalTex.wrapV = Texture.CLAMP_ADDRESSMODE;
  clonedMetalTex.generateMipMaps = false;
  clonedMetalTex.updateSamplingMode(Texture.NEAREST_NEAREST); // 🔍 avoids shimmering

  const pbr = new PBRMaterial("metalView_" + originalMesh.name, scene);
  pbr.albedoColor = new Color3(0, 0, 0); // Dark base for pure metal view
  pbr.metallicTexture = clonedMetalTex;

  pbr.useMetallnessFromMetallicTextureBlue = true;
  pbr.useRoughnessFromMetallicTextureGreen = true;
  pbr.useRoughnessFromMetallicTextureAlpha = false;

  // ✅ Prevent lighting shimmer
  pbr.environmentTexture = null;              // <--- NO lighting (important)
  pbr.disableLighting = true;                // <--- NO scene light contribution
  pbr.backFaceCulling = false;
  pbr.forceDepthWrite = true;
  pbr.zOffset = -1;
  pbr.renderingGroupId = 1;

  metalClone.material = pbr;
  metalClone.isPickable = false;
  metalClone.visibility = 0;
  metalClone.receiveShadows = false;
  metalClone.computeWorldMatrix(true);
  metalClone.setEnabled(false);

  metalMapMeshList.push(metalClone);
} */

  function createMetalRoughClone(originalMesh) {
    if (!originalMesh || !originalMesh.material) return;
  
    const originalMat = originalMesh.material;
    if (!(originalMat instanceof PBRMaterial) || !originalMat.metallicTexture) {
      console.warn("⚠️ No metallic texture found for", originalMesh.name);
      return;
    }
  
    // Clone the entire material (deep clone)
    const clonedMat = originalMat.clone("metalViewMat_" + originalMesh.name);
  
    // Override properties to focus on metalness preview:
    clonedMat.albedoColor = new Color3(0, 0, 0); // black base to emphasize metalness
    clonedMat.useMetallnessFromMetallicTextureBlue = true;
    clonedMat.useRoughnessFromMetallicTextureGreen = true;
    clonedMat.useRoughnessFromMetallicTextureAlpha = false;
  
    // Optional: adjust lighting environment if needed
    clonedMat.environmentTexture = originalMat.environmentTexture || scene.environmentTexture;
    clonedMat.disableLighting = false;
    clonedMat.backFaceCulling = false;
  
    // Create clone of mesh and assign the cloned material
    const metalClone = originalMesh.clone(originalMesh.name + "_metalClone");
    if (!metalClone) return;
  
    metalClone.material = clonedMat;
    metalClone.isPickable = false;
    metalClone.visibility = 0;
    metalClone.receiveShadows = false;
    metalClone.computeWorldMatrix(true);
    metalClone.setEnabled(true);
  
    metalMapMeshList.push(metalClone);
  }


const metalnessToggle = document.getElementById("toggleMetalness");
let metalMapEnabled = false;

metalnessToggle.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));

  if (!metalMapEnabled) {
    console.log("🔷 Enabling metalness preview...");
    meshList.forEach(mesh => {
      createMetalRoughClone(mesh);
      mesh.visibility = 0;
    });

    metalMapMeshList.forEach(clone => {
      clone.visibility = 1;
      clone.setEnabled(true);
    });

    metalMapEnabled = true;
  } else {
    console.log("🧹 Disabling metalness preview and cleaning up...");
    metalMapMeshList.forEach(clone => {
      if (clone.material?.metallicTexture?.name?.startsWith("ClonedMetalTex_")) {
        clone.material.metallicTexture.dispose();
      }
      clone.material?.dispose();
      clone.dispose();
    });

    metalMapMeshList.length = 0;

    meshList.forEach(mesh => {
      mesh.visibility = 1;
      mesh.setEnabled(true);
    });

    metalMapEnabled = false;
  }
});

//metcap texture
//Creating Custom Shader To Preview Matcap By Getting The Normal Map
Effect.ShadersStore["matcapVertexShader"] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
varying vec3 vViewNormal;
void main() {
  vec3 worldNormal = normalize(mat3(world) * normal);
  vec3 viewNormal = normalize(mat3(view) * worldNormal);
  vViewNormal = viewNormal;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

Effect.ShadersStore["matcapFragmentShader"] = `
precision highp float;
varying vec3 vViewNormal;
uniform sampler2D matcapTexture;
void main() {
  vec3 n = normalize(vViewNormal);
  vec2 uv = clamp(n.xy * 0.5 + 0.5, 0.0, 1.0);
  uv.y = 1.0 - uv.y;
  vec3 color = texture2D(matcapTexture, uv).rgb;
  gl_FragColor = vec4(color, 1.0);
}`;

function createMatCapClone(originalMesh) {
    const matcapClone = originalMesh.clone(originalMesh.name + "_matcapClone");
    if (!matcapClone) return;
  
    const shader = new ShaderMaterial("matcapShader_" + originalMesh.name, scene, {
      vertex: "matcap",
      fragment: "matcap"
    }, {
      attributes: ["position", "normal"],
      uniforms: ["worldViewProjection", "world", "view"],
      samplers: ["matcapTexture"]
    });
  
    applyRenderFixes(shader);
  
    const matcapTex = new Texture("https://raw.githubusercontent.com/nidorx/matcaps/master/1024/28292A_D3DAE5_A3ACB8_818183.png", scene);
    matcapTex.gammaSpace = true;
    shader.setTexture("matcapTexture", matcapTex);
  
    matcapClone.material = shader;
    matcapClone.isPickable = false;
    matcapClone.visibility = 0;
    matcapClone.computeWorldMatrix(true);
  
    matcapMeshList.push(matcapClone);
}

const toggleMatcapBtn = document.getElementById("toggleMatcap");
let matcapEnabled = false;

toggleMatcapBtn.addEventListener("click", () => {
  window.dispatchEvent(new Event("pauseAndReset"));
    if (!matcapEnabled) {
      meshList.forEach(mesh => {
        createMatCapClone(mesh);
        mesh.visibility=0;
        //disableMesh(mesh)
      });
    matcapMeshList.forEach(clone =>{
        clone.visibility = 1;
    })
    matcapEnabled = true;
    return;
    }else{
        matcapMeshList.forEach(clone =>{
            clone.visibility = 0;
            clone.dispose();
        });
        matcapMeshList.length = 0;
        meshList.forEach(mesh =>{
            mesh.visibility =1;
            //enableMesh(mesh)
        });
        matcapEnabled = false;   
    }
});



  
//Button Checker
export function checkingForPresentTexture(flags){
    console.log("It is working!");
    if(flags.hasNormal){
        console.log("button is visible!")
        createNormalLitCloneBtn.style.display = "block";
    }else{
        createNormalLitCloneBtn.style.display = "none";
        console.log("button is invisible!")
    }
    if(flags.hasEmissive){
        toggleEmissiveBtn.style.display ="block";
    }else{
        toggleEmissiveBtn.style.display ="none";
    }
    if(flags.hasRoughness){
        toggleRoughnessBtn.style.display ="block";
    }else{
        toggleRoughnessBtn.style.display ="none";
    }
    if(flags.hasMetallic){
        metalnessToggle.style.display = "block";
    }else{
        metalnessToggle.style.display = "none";
    }
    if(!flags.hasNormal && !flags.hasEmissive && !flags.hasMetallic && !flags.hasRoughness){
      document.querySelector("#materials").style.display = "none";
    }

}


export {
    canvas,
    engine,
    scene,
    meshList,
    originalMaterials,
    wireframeClones,
    NormalMapMeshList,
    UVCheckerMeshList,
    untexturedMeshes,
    flags,
    createWireframeClone,
    createUVCheckerClone,
    clearSceneMeshes,
    uvToggleBtn,
    createNormalLitCloneBtn
  };