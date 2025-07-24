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

function applyRenderFixes(shaderMaterial) {
    shaderMaterial.forceDepthWrite = true;
    shaderMaterial.zOffset = -1;
    shaderMaterial.backFaceCulling = false;
}

/* function disableMesh(mesh) {
    mesh.visibility = 0;
    if (mesh.material) mesh.material.depthWrite = false;
    mesh.setEnabled(false);
  }
  
  function enableMesh(mesh) {
    mesh.visibility = 1;
    if (mesh.material) mesh.material.depthWrite = true;
    mesh.setEnabled(true);
  } */

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
    if (!uvCheckerEnabled) {
        meshList.forEach(mesh=>{
            console.log("Toggle On");
            createUVCheckerClone(mesh);
            mesh.visibility =0;
        });

        UVCheckerMeshList.forEach(clone =>{
            clone.visibility = 1;
        })
        uvCheckerEnabled = true;
    }
    else{
        UVCheckerMeshList.forEach(clone =>{
            clone.visibility = 0;
            clone.dispose();
        })
        UVCheckerMeshList.length = 0;
        meshList.forEach(mesh =>{
            mesh.visibility = 1;
        })
        uvCheckerEnabled = false;
    } 
});


//Normal Texture

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

let createNormalLitCloneBtn = document.getElementById("createNormalLitClone");
let normalMapEnabled = false; 

createNormalLitCloneBtn.addEventListener("click", () => {
  if (!normalMapEnabled) {
    console.log("normal map list: ", NormalMapMeshList);
    console.log("normal toggle on !");
    meshList.forEach(mesh =>{
      createNormalMapPreviewClone(mesh);
      mesh.visibility=0;
    })
    NormalMapMeshList.forEach(clone =>{
        clone.visibility =1;
    })
    normalMapEnabled = true;
    return;
  }
  else{
    NormalMapMeshList.forEach(clone =>{
        clone.visibility = 0;
        clone.dispose();
    })
    NormalMapMeshList.length = 0;
    meshList.forEach(c => c.visibility = 1);
    normalMapEnabled = false;
  }

});

//emissive texture

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
    pbr.zOffset = -1;

    emissiveClone.material = pbr;
    emissiveClone.isPickable = false;
    emissiveClone.visibility = 0;
    emissiveClone.receiveShadows = false;
    emissiveClone.position = originalMesh.position.clone();



    EmissiveMapMeshList.push(emissiveClone);
}

const toggleEmissiveBtn = document.getElementById("toggleEmissive");
let emissiveMapEnabled = false; 


toggleEmissiveBtn.addEventListener("click", () => {
    if (!emissiveMapEnabled) {
        meshList.forEach(mesh => {
          createEmissiveShadedClone(mesh);
          mesh.visibility = 0;
      });
  
      EmissiveMapMeshList.forEach(clone =>{
          clone.visibility = 1;
      })
      emissiveMapEnabled = true;
      return;
      }
      else{
      EmissiveMapMeshList.forEach(clone =>{
          clone.visibility = 0;
          clone.dispose();
      });
      EmissiveMapMeshList.length = 0;
      meshList.forEach(mesh =>{
          mesh.visibility = 1;
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

const metalnessToggle = document.getElementById("toggleMetalness");
let metalMapEnabled = false;

metalnessToggle.addEventListener("click", () => {
    if (!metalMapEnabled) {
      meshList.forEach(mesh => {
        createMetalRoughClone(mesh);
        mesh.visibility = 0;
    });
    metalMapMeshList.forEach(clone => {
        clone.visibility = 1;
    });
    metalMapEnabled = true;
    } else {
      metalMapMeshList.forEach(clone => {
        clone.visibility = 0;
        clone.dispose();
      });
      metalMapMeshList.length = 0;
      meshList.forEach(mesh => {
        mesh.visibility = 1;
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