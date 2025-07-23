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
    PointsCloudSystem
} from "@babylonjs/core";


let clearFileMapCallback = null;

export function registerClearFileMapCallback(callback) {
  clearFileMapCallback = callback;
}

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(1, 1, 1, 1);

const meshList = [];
const originalMaterials = [];
const standardMaterialsMeshList = [];
const wireframeClones = []; // store clones with wireframe material
const NormalMapMeshList = [];
const metalMapMeshList = [];
const EmissiveMapMeshList = [];
const UVCheckerMeshList = [];
const roughnessMapMeshList = [];
const matcapMeshList = [];
const matcapSurfaceMeshList = [];
const baseColorMeshList = [];
const untexturedMeshes =[];

const textureFlags = {
    hasMetalnessTexture: false,
    hasRoughnessTexture: true,
    hasNormalTexture: false,
    hasEmissiveTexture: true,
};

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

Effect.ShadersStore["matcapSurfaceVertexShader"] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
varying vec3 vViewNormal;
varying vec2 vUV;
void main() {
  vec3 worldNormal = normalize(mat3(world) * normal);
  vec3 viewNormal = normalize(mat3(view) * worldNormal);
  vViewNormal = viewNormal;
  vUV = uv;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

Effect.ShadersStore["matcapSurfaceFragmentShader"] = `
precision highp float;
varying vec3 vViewNormal;
varying vec2 vUV;
uniform sampler2D baseTexture;
uniform sampler2D matcapTexture;
void main() {
  vec3 n = normalize(vViewNormal);
  vec2 matcapUV = n.xy * 0.5 + 0.5;
  vec3 baseColor = texture2D(baseTexture, vUV).rgb;
  vec3 matcapColor = texture2D(matcapTexture, matcapUV).rgb;
  float blendStrength = clamp(n.z, 0.0, 1.0);
  vec3 finalColor = mix(baseColor, matcapColor, 1.0 - blendStrength);
  gl_FragColor = vec4(finalColor, 1.0);
}`;

function applyRenderFixes(shaderMaterial) {
  shaderMaterial.forceDepthWrite = true;
  shaderMaterial.zOffset = -1;
  shaderMaterial.backFaceCulling = false;
}

function createBaseColorClone(originalMesh) {
  const clone = originalMesh.clone(originalMesh.name + "_baseColor");
  if (!clone || !originalMesh.material) return;

  const originalMat = originalMesh.material;
  let baseTexture = null;
  let baseColor = new Color3(1, 1, 1);

  if (originalMat instanceof PBRMaterial) {
    baseTexture = originalMat.albedoTexture;
    baseColor = originalMat.albedoColor || baseColor;
  } else if (originalMat instanceof StandardMaterial) {
    baseTexture = originalMat.diffuseTexture;
    baseColor = originalMat.diffuseColor || baseColor;
  }

  const flatMat = new StandardMaterial("flatBaseColor_" + originalMesh.name, scene);
  flatMat.disableLighting = true;
  flatMat.emissiveColor = baseColor.clone();
  if (baseTexture) {
    baseTexture.gammaSpace = true;
    flatMat.emissiveTexture = baseTexture;
  }

  clone.material = flatMat;
  clone.isPickable = false;
  clone.visibility = 0;
  clone.isVisible = false;

  baseColorMeshList.push(clone);
}






function createMatCapSurfaceClone(originalMesh) {
  const clone = originalMesh.clone(originalMesh.name + "_matcapSurfaceClone");
  if (!clone) return;

  const shader = new ShaderMaterial("matcapSurfaceShader_" + originalMesh.name, scene, {
    vertex: "matcapSurface",
    fragment: "matcapSurface",
  }, {
    attributes: ["position", "normal", "uv"],
    uniforms: ["world", "view", "worldViewProjection"],
    samplers: ["baseTexture", "matcapTexture"]
  });

  applyRenderFixes(shader);

  let baseTexture = null;
  if (originalMesh.material instanceof PBRMaterial) {
    baseTexture = originalMesh.material.albedoTexture;
  } else if (originalMesh.material instanceof StandardMaterial) {
    baseTexture = originalMesh.material.diffuseTexture;
  }
  if (!baseTexture) return;

  const matcapTexture = new Texture("https://raw.githubusercontent.com/nidorx/matcaps/master/1024/28292A_D3DAE5_A3ACB8_818183.png", scene);
  matcapTexture.gammaSpace = true;

  shader.setTexture("baseTexture", baseTexture);
  shader.setTexture("matcapTexture", matcapTexture);

  clone.material = shader;
  clone.isPickable = false;
  clone.visibility = 0;
  clone.computeWorldMatrix(true);

  matcapSurfaceMeshList.push(clone);
}



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

function createEmissiveShadedClone(originalMesh) {
 const emissiveClone = originalMesh.clone(originalMesh.name + "_emissiveShaded");
 if (!emissiveClone || !originalMesh.material) return;

 const originalMat = originalMesh.material;
 const emissiveTexture = originalMat.emissiveTexture;

 if (!emissiveTexture) {
   console.warn("⚠️ No emissive texture found for", originalMesh.name);
   return;
 }

 const pbr = new PBRMaterial("emissiveShaded_" + originalMesh.name, scene);
 pbr.albedoColor = new Color3(0, 0, 0); // No base color
 pbr.emissiveTexture = emissiveTexture;
 pbr.emissiveColor = Color3.White(); // Can change to match emissive factor
 pbr.metallic = 0;
 pbr.roughness = 1;
 pbr.backFaceCulling = false;
 pbr.usePhysicalLightFalloff = false;

 emissiveClone.material = pbr;
 emissiveClone.isPickable = false;
 emissiveClone.visibility = 0;
 emissiveClone.receiveShadows = false;
 emissiveClone.position = originalMesh.position.clone();

 EmissiveMapMeshList.push(emissiveClone);
}
let vertexCloud = null;
function showVertices(meshes, scene) {
 // Dispose previous
 if (vertexCloud) {
   vertexCloud.dispose();
   vertexCloud = null;
 }

 const lines = [];

 meshes.forEach(mesh => {
   const positions = mesh.getVerticesData("position");
   const normals = mesh.getVerticesData("normal");

   if (!positions || !normals) return;

   const transform = mesh.getWorldMatrix();

   for (let i = 0; i < positions.length; i += 3) {
     const pos = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
     const norm = new Vector3(normals[i], normals[i + 1], normals[i + 2]);

     const worldPos = Vector3.TransformCoordinates(pos, transform);
     const worldNorm = Vector3.TransformNormal(norm, transform).normalize();

     const needleLength = 0.7; // You can tweak this for longer needles
     const end = worldPos.add(worldNorm.scale(needleLength));

     lines.push([worldPos, end]); // Line from vertex to vertex + normal
   }
 });

 // Create the needle mesh
 vertexCloud = MeshBuilder.CreateLineSystem("vertexNeedles", {
   lines: lines,
   updatable: false,
 }, scene);

 vertexCloud.isPickable = false;

 const lineMat = new StandardMaterial("needleMat", scene);
 lineMat.emissiveColor = new Color3(1, 0, 0); // red
 lineMat.disableLighting = true;

 vertexCloud.material = lineMat;
}


let wireframeMaterial; // shared material
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


function createNormalMapPreviewClone(originalMesh) {
 const previewClone = originalMesh.clone(originalMesh.name + "_normalPreview");
 if (!previewClone || !originalMesh.material) return;

 const originalMat = originalMesh.material;
 const normalTexture = originalMat.normalTexture || (originalMat instanceof PBRMaterial && originalMat.bumpTexture);

 if (!normalTexture) {
   console.warn("⚠️ No normal texture found for", originalMesh.name);
   return;
 }

 // ⚠️ We're using the normal texture as a color map instead of for lighting
 const previewMat = new StandardMaterial("normalPreviewMat_" + originalMesh.name, scene);
 previewMat.diffuseTexture = normalTexture;
 previewMat.emissiveColor = new Color3(1, 1, 1); // boost visibility
 previewMat.disableLighting = true; // ❌ turn off lighting, show texture only

 previewClone.material = previewMat;
 previewClone.isPickable = false;
 previewClone.visibility = 0;

 NormalMapMeshList.push(previewClone);
}

function createMetalRoughClone(originalMesh) {
  const metalClone = originalMesh.clone(originalMesh.name + "_metalClone");
  if (!metalClone || !originalMesh.material) return;

  const originalMat = originalMesh.material;
  if (!(originalMat instanceof PBRMaterial) || !originalMat.metallicTexture) {
    console.warn("⚠️ No metallic texture found for", originalMesh.name);
    return;
  }

  const pbr = new PBRMaterial("metalView_" + originalMesh.name, scene);

  // ✳️ Use black albedo so metal/rough map dominates
  pbr.albedoColor = new Color3(0, 0, 0);

  // ✅ Apply metal/rough texture
  pbr.metallicTexture = originalMat.metallicTexture;
  pbr.useMetallnessFromMetallicTextureBlue = true;
  pbr.useRoughnessFromMetallicTextureGreen = true;
  pbr.useRoughnessFromMetallicTextureAlpha = false;

  // ✅ Force lighting environment to reduce shimmer
  pbr.environmentTexture = scene.environmentTexture;
  pbr.forceIrradianceInFragment = true;

  // 🔧 Reduce specular aliasing/shimmering
  pbr.environmentIntensity = 1;
  pbr.realTimeFiltering = true;
  pbr.backFaceCulling = false;

  metalClone.material = pbr;
  metalClone.isPickable = false;
  metalClone.visibility = 0;
  metalClone.computeWorldMatrix(true);

  metalMapMeshList.push(metalClone);
}




function toStandardMaterial(mesh) {
 const clone = mesh.clone(mesh.name + "_standard");

 if (!clone) return;

 const redMat = new StandardMaterial("redMat_" + mesh.name, scene);
 redMat.diffuseColor = new Color3(1, 0, 0);
 redMat.specularColor = new Color3(0, 0, 0);

 clone.material = redMat;
 clone.isPickable = false; // Optional: prevent interaction
 clone.visibility = 0;     // Start hidden

 standardMaterialsMeshList.push(clone);

 return clone;
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


// Getting Button Elements From The DOM And Setting Their Initial Values

const toggleBtn = document.getElementById("toggleWireframe");
let wireframeEnabled = false;


const createNormalLitCloneBtn = document.getElementById("createNormalLitClone");
let flagforOriginalMesh = true;
let normalMapEnabled = false;


const showVerticesBtn = document.getElementById("showVerticesBtn");
let verticesShown = false;


const toggleEmissiveBtn = document.getElementById("toggleEmissive");
let emissiveMapEnabled = false;

const uvToggleBtn = document.getElementById("toggleUVChecker");
let uvCheckerEnabled = false;

const metalnessToggle = document.getElementById("toggleMetalness");
let metalMapEnabled = false;

const toggleRoughnessBtn = document.getElementById("toggleRoughness");
let roughnessEnabled = false;

const toggleMatcapBtn = document.getElementById("toggleMatcap");
let matcapEnabled = false;

const toggleMatcapSurfaceBtn = document.getElementById("toggleMatcapSurfaceBtn");
let matcapSurfaceVisible = false;

const toggleBaseColorBtn = document.getElementById("toggleBaseColor");
let baseColorEnabled = false;


//Functions to control buttons

toggleBtn.addEventListener("click", () => {
    if (!wireframeEnabled) {
      meshList.forEach(mesh=>{
        createWireframeClone(mesh);
      })
      let val = 1;
      toggleWireframe(val);
      wireframeEnabled = true;
    } else {
      let val = 0;
      toggleWireframe(val);
      wireframeEnabled = false;
    }
  });
  
  function toggleWireframe(val) {
    wireframeClones.forEach(clone => {
      clone.visibility = val;
    });
  }
  
  showVerticesBtn.addEventListener("click", () => {
    if (!verticesShown) {
      showVertices(meshList, scene);
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
  });
  
  
  createNormalLitCloneBtn.addEventListener("click", () => {
    if (!normalMapEnabled) {
      console.log("normal map list: ", NormalMapMeshList);
      console.log("normal toggle on !");
      meshList.forEach(c => c.visibility = 0);
      meshList.forEach(mesh =>{
        createNormalMapPreviewClone(mesh);
      })
      console.log("normal clone created !")
      console.log("normal map list: ", NormalMapMeshList);
      NormalMapMeshList.forEach(m => m.isVisible = true);
      normalMapEnabled = true;
      return;
    }
  
    console.log("normal toggle off");
    NormalMapMeshList.length = 0;
    meshList.forEach(c => c.visibility = 1);
    normalMapEnabled = false;
  });
  
  
  uvToggleBtn.addEventListener("click", () => {
    if (!uvCheckerEnabled) {
      console.log("✅ UV toggle ON");
      meshList.forEach(m => m.isVisible = false);
  
      // Only create if not already created
      if (UVCheckerMeshList.length === 0) {
        meshList.forEach(mesh => createUVCheckerClone(mesh));
      }
  
      UVCheckerMeshList.forEach(m => m.isVisible = true);
      uvCheckerEnabled = true;
      return;
    }
  
    console.log("❌ UV toggle OFF");
    UVCheckerMeshList.forEach(mesh => mesh.dispose());
    UVCheckerMeshList.length = 0;
  
    meshList.forEach(m => m.isVisible = true);
    uvCheckerEnabled = false;
  });