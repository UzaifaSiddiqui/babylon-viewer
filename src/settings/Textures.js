//Textures

import {
    Vector3,
    Color4,
    StandardMaterial,
    PBRMaterial,
    Texture,
  } from "@babylonjs/core"; 

import * as Settings from "./setting.js";
import { showBottomPopup } from "../ui/UI.js";

import * as Loader from "../core/Loader.js";


const engine = Settings.engine;

export function fallBackMaterial(fileMap , scene){
    function findMap(...keywords) {
        const lowerKeywords = keywords.map(k => k.toLowerCase());
        return [...fileMap.entries()].find(([filename]) => {
            const name = filename.toLowerCase();
            return lowerKeywords.some(k => name.includes(k));
        })?.[1];
    }

    const albedoMap = findMap("albedo", "basecolor", "diffuse", "color");
    const aoMap = findMap("ao", "ambient");
    const normalMap = findMap("normal", "nmap", "norm");
    const roughnessMap = findMap("roughness", "rmap", "rough");
    const metalnessMap = findMap("metalness", "metal", "metallic", "mmap");


    const mat = new PBRMaterial("customPBR", scene);
    if (albedoMap) mat.albedoTexture = new Texture(albedoMap, scene);
    if (aoMap) mat.ambientTexture = new Texture(aoMap, scene);
    if (normalMap) mat.bumpTexture = new Texture(normalMap, scene);
    if (roughnessMap) mat.roughnessTexture = new Texture(roughnessMap, scene);
    if (metalnessMap) mat.metallicTexture = new Texture(metalnessMap, scene);

    mat.roughness = 0.5;
    mat.metallic = 0.5;

    scene.meshes.forEach(mesh => {
        console.log(mesh.name, mesh.material?.name || "No material");
        if (mesh.material) mesh.material.dispose();
        mesh.material = mat;
    });

    console.log("🎨 Applied fallback material with found textures");
}

function parseMTLFromFile(mtlText) {
    const materials = {};
    let current = null;
    const lines = mtlText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('newmtl ')) {
        current = trimmed.split(' ')[1];
        materials[current] = {};
      } else if (current && trimmed.startsWith('map_Kd ')) {
        const tex = trimmed.split(' ')[1];
        materials[current].diffuseTexture = tex;
      }
    }
    return materials;
}

export async function remapper(fileMap){
    const originalCreateTexture = engine.createTexture.bind(engine);

    engine.createTexture = function (url, noMipmap, invertY, sceneOrEngine, samplingMode, onLoad, onError, buffer, fallback, format, forcedExtension, mimeType, loaderOptions, creationFlags) {
    const filename = url.split("/").pop();
    const keys = Array.from(fileMap.keys());
    const matchedKey = keys.find(k => k.endsWith(filename));
    const blobUrl = matchedKey ? fileMap.get(matchedKey) : url;

    console.log("🖼️ [Custom createTexture] Redirecting:", url, "→", blobUrl);

    return originalCreateTexture(
        blobUrl,
        noMipmap,
        invertY,
        sceneOrEngine,
        samplingMode,
        onLoad,
        onError,
        buffer,
        fallback,
        format,
        forcedExtension,
        mimeType,
        loaderOptions,
        creationFlags
    );
    };
}

  // ✅ Function to apply parsed MTL
 export async function applyMTLTextures(scene, fileMap) {
    console.log("🔍 Applying MTL textures");
    const mtlEntry = [...fileMap.entries()].find(([name]) => name.endsWith(".mtl"));
    showBottomPopup("Apply Texture Manually",  5000)
    if (!mtlEntry) return;
    console.log("mtlEntry: ",mtlEntry);
  
    const [filename, blobUrl] = mtlEntry;
    const mtlText = await fetch(blobUrl).then(res => res.text());
    const parsedMaterials = parseMTLFromFile(mtlText);
    console.log("parsedMaterials : ",parsedMaterials);
  
    for (const mesh of scene.meshes) {
        const matName = mesh.material?.name || mesh.name;
        console.log("matName :",matName);
        const fallbackKeys = Object.keys(parsedMaterials);
        const fallbackMaterialName = fallbackKeys.length === 1 ? fallbackKeys[0] : matName;
      
        const matData = parsedMaterials[matName] || parsedMaterials[fallbackMaterialName];
        if (matData?.diffuseTexture) {
          const texFile = matData.diffuseTexture;
          const matchedUrl =
            fileMap.get(texFile) ||
            [...fileMap.entries()].find(([k]) => k.endsWith(texFile))?.[1];
      
          if (matchedUrl) {
            const mat = new StandardMaterial(`mtl_${matName}`, scene);
            mat.diffuseTexture = new Texture(matchedUrl, scene);
            mesh.material = mat;
            console.log(`🎯 Applied texture ${texFile} to mesh "${mesh.name}" using MTL "${fallbackMaterialName}"`);
            showBottomPopup("Applying Texture", 4000);
          } else {
            console.warn(`❌ Texture "${texFile}" not found in fileMap for "${fallbackMaterialName}"`);
          }
        }
      }
  }
  



/* export function createTextureAssignmentUI(fileMap , scene) {
    let panel = document.getElementById("texturePanel");
    if (panel) panel.remove(); // Remove old panel if it exists
  
    panel = document.createElement("div");
    panel.id = "texturePanel";
  
    // 🌟 Panel Styling
    Object.assign(panel.style, {
      position: "absolute",
      top: "50px",
      right: "20px",
      width: "280px",
      maxHeight: "90vh",
      overflowY: "auto",
      padding: "20px",
      background: "#f9f9f9",
      border: "1px solid #ccc",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#333",
      zIndex: 1000,
    });
  
    panel.innerHTML = `<h3 style="margin-top:0; margin-bottom:10px;">🖼️ Texture Assignment</h3>`;
  
    // 🔽 Mesh Selector Dropdown
    const meshLabel = document.createElement("label");
    meshLabel.textContent = "🎯 Apply To Mesh:";
    meshLabel.style.display = "block";
    meshLabel.style.marginBottom = "5px";
  
    const meshSelect = document.createElement("select");
    meshSelect.style.width = "100%";
    meshSelect.style.padding = "5px";
    meshSelect.style.marginBottom = "15px";
  
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Meshes";
    meshSelect.appendChild(allOption);
  
    scene.meshes.forEach((m, i) => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `Mesh ${i + 1} (${m.name})`;
      meshSelect.appendChild(option);
    });
  
    panel.appendChild(meshLabel);
    panel.appendChild(meshSelect);
  
    // 🎨 Texture selectors
    const textureRoles = ["Albedo", "Normal", "Metallic", "Roughness", "AO"];
    const selectors = {};
  
    textureRoles.forEach(role => {
      const container = document.createElement("div");
      container.style.marginBottom = "12px";
  
      const label = document.createElement("label");
      label.textContent = role + ":";
      label.style.display = "block";
      label.style.marginBottom = "3px";
  
      const select = document.createElement("select");
      select.style.width = "100%";
      select.style.padding = "5px";
  
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "-- Select Texture --";
      select.appendChild(emptyOption);
  
      for (const [name, url] of fileMap.entries()) {
        if (!name.match(/\.(png|jpg|jpeg|tga|tga\.png)$/i)) continue;
        const option = document.createElement("option");
        option.value = url;
        option.textContent = name;
        select.appendChild(option);
      }
  
      selectors[role.toLowerCase()] = select;
      container.appendChild(label);
      container.appendChild(select);
      panel.appendChild(container);
    });
  
    // ✅ Apply Button
    const applyBtn = document.createElement("button");
    applyBtn.textContent = "🎨 Apply Material";
    applyBtn.style.width = "100%";
    applyBtn.style.padding = "10px";
    applyBtn.style.border = "none";
    applyBtn.style.background = "#007BFF";
    applyBtn.style.color = "#fff";
    applyBtn.style.borderRadius = "6px";
    applyBtn.style.cursor = "pointer";
    applyBtn.style.fontWeight = "bold";
    applyBtn.style.marginTop = "10px";
  
    applyBtn.onmouseenter = () => applyBtn.style.background = "#0056b3";
    applyBtn.onmouseleave = () => applyBtn.style.background = "#007BFF";
  
    panel.appendChild(applyBtn);
    document.body.appendChild(panel);
  
    // 🧠 Apply Material Logic
    applyBtn.addEventListener("click", () => {
      const mat = new PBRMaterial("customPBR", scene);
      if (selectors.albedo.value) mat.albedoTexture = new Texture(selectors.albedo.value, scene);
      if (selectors.normal.value) mat.bumpTexture = new Texture(selectors.normal.value, scene);
      if (selectors.metallic.value) mat.metallicTexture = new Texture(selectors.metallic.value, scene);
      if (selectors.roughness.value) mat.roughnessTexture = new Texture(selectors.roughness.value, scene);
      if (selectors.ao.value) mat.ambientTexture = new Texture(selectors.ao.value, scene);
  
      mat.roughness = 0.5;
      mat.metallic = 0.5;
  
      const target = meshSelect.value;
      if (target === "all") {
        scene.meshes.forEach(m => {
          if (m.material) m.material.dispose();
          m.material = mat;
        });
        console.log("✅ Applied material to all meshes.");
      } else {
        const index = parseInt(target);
        const mesh = scene.meshes[index];
        if (mesh) {
          if (mesh.material) mesh.material.dispose();
          mesh.material = mat;
          console.log(`✅ Applied material to Mesh ${index + 1} (${mesh.name})`);
        }
      }
    });
  } */
  


    export function createTextureAssignmentUI(fileMap, originalMaterials ,scene) {

      let panel = document.getElementById("texturePanel");
      if (panel) {
        panel.innerHTML = ""; // Clear old content
      } else {
        panel = document.createElement("div");
        panel.id = "texturePanel"; // Styling handled via CSS class in index.html
        document.body.appendChild(panel);
      }
      const uploadLabel = document.createElement("label");
      uploadLabel.textContent = "Upload Texture:";
      panel.appendChild(uploadLabel);

      const uploadInput = document.createElement("input");
      uploadInput.type = "file";
      uploadInput.accept = ".png, .jpg, .jpeg, .tga"; // allowed formats
      uploadInput.style.marginBottom = "10px";
      panel.appendChild(uploadInput);

      // Handle upload
      uploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        fileMap.set(file.name, url);

        // Update all texture role dropdowns
        Object.keys(selectors).forEach(key => {
          const select = selectors[key];
          const option = document.createElement("option");
          option.value = url;
          option.textContent = file.name;
          select.appendChild(option);
        });

        console.log(`📁 Texture uploaded: ${file.name}`);
      });
    
      // Title
      const title = document.createElement("h3");
      title.textContent = "Texture Assignment";
      panel.appendChild(title);
    
      // Mesh selector
      const meshLabel = document.createElement("label");
      meshLabel.textContent = "Apply To Mesh:";
      panel.appendChild(meshLabel);
    
      const meshSelect = document.createElement("select");
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All Meshes";
      meshSelect.appendChild(allOption);
    
      originalMaterials.forEach((m, i) => {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `Mesh ${i + 1} (${m.name})`;
        meshSelect.appendChild(option);
      });
    
      panel.appendChild(meshSelect);
    
      // Texture type dropdowns
      const textureRoles = ["Albedo", "Normal", "Metallic", "Roughness", "AO"];
      const selectors = {};
    
      textureRoles.forEach(role => {
        const label = document.createElement("label");
        label.textContent = role + ":";
        panel.appendChild(label);
    
        const select = document.createElement("select");
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- Select Texture --";
        select.appendChild(defaultOpt);
    
        for (const [name, url] of fileMap.entries()) {
          if (!name.match(/\.(png|jpg|jpeg|tga|tga\.png)$/i)) continue;
          const option = document.createElement("option");
          option.value = url;
          option.textContent = name;
          select.appendChild(option);
        }
    
        selectors[role.toLowerCase()] = select;
        panel.appendChild(select);
      });
    
      // Apply Material Button
      const applyBtn = document.createElement("button");
      applyBtn.textContent = "Apply Material";
      applyBtn.style.marginTop = "10px";
      applyBtn.addEventListener("click", () => {
        const mat = new PBRMaterial("customPBR", scene);
    
        if (selectors.albedo.value) mat.albedoTexture = new Texture(selectors.albedo.value, scene);
        if (selectors.normal.value) mat.bumpTexture = new Texture(selectors.normal.value, scene);
        if (selectors.metallic.value) mat.metallicTexture = new Texture(selectors.metallic.value, scene);
        if (selectors.roughness.value) mat.roughnessTexture = new Texture(selectors.roughness.value, scene);
        if (selectors.ao.value) mat.ambientTexture = new Texture(selectors.ao.value, scene);
    
        mat.roughness = 0.5;
        mat.metallic = 0.5;
    
        const target = meshSelect.value;
        if (target === "all") {
          originalMaterials.forEach(m => {
            if (m.material) m.material.dispose();
            m.material = mat;
          });
          console.log("✅ Applied material to all meshes.");
        } else {
          const index = parseInt(target);
          const mesh = originalMaterials[index];
          if (mesh) {
            if (mesh.material) mesh.material.dispose();
            mesh.material = mat;
            console.log(`✅ Applied material to Mesh ${index + 1} (${mesh.name})`);
          }
        }
      });
      panel.appendChild(applyBtn);
    }

  
  export async function applyDAETextures(scene, fileMap, daeText) {
    let appliedAny = false;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(daeText, "application/xml");
  
    const imageMap = new Map(); // image ID → texture file name
    xmlDoc.querySelectorAll("library_images image").forEach(image => {
      const id = image.getAttribute("id");
      const file = image.querySelector("init_from")?.textContent?.trim();
      if (id && file) imageMap.set(id, file);
    });
  
    const materialTextureMap = new Map(); // effect ID → texture file
    xmlDoc.querySelectorAll("library_effects effect").forEach(effect => {
      const effectId = effect.getAttribute("id");
      const diffuse = effect.querySelector("profile_COMMON technique > phong > diffuse > texture");
      const textureId = diffuse?.getAttribute("texture");
      if (textureId) {
        const sampler = xmlDoc.querySelector(`newparam[sid="${textureId}"] > source`);
        const surfaceId = sampler?.textContent?.trim();
        const imageFile = imageMap.get(surfaceId);
        if (effectId && imageFile) {
          materialTextureMap.set(effectId, imageFile);
        }
      }
    });
  
    const materialBindings = new Map(); // materialSymbol → effectId
    xmlDoc.querySelectorAll("library_materials material").forEach(material => {
      const id = material.getAttribute("id");
      const instanceEffect = material.querySelector("instance_effect");
      const effectUrl = instanceEffect?.getAttribute("url")?.replace(/^#/, "");
      if (id && effectUrl) {
        materialBindings.set(id, effectUrl);
      }
    });
  
    for (const mesh of scene.meshes) {
      if (mesh.name === "__root__") continue;
  
      const matName = mesh.material?.name || mesh.name;
      const effectId = materialBindings.get(matName);
      let texFile = materialTextureMap.get(effectId);
  
      // 🧠 If DAE file didn't define texture, guess it using naming convention
      if (!texFile) {
        const candidates = Array.from(fileMap.keys()).filter(key =>
          key.toLowerCase().includes(matName.toLowerCase()) &&
          key.toLowerCase().includes("albedo")
        );
        if (candidates.length > 0) {
          texFile = candidates[0]; // Pick best match
          console.warn(`🧠 No texture in DAE — guessed "${texFile}" for material "${matName}"`);
        }
      }
  
      if (texFile) {
        const matchedUrl =
          fileMap.get(texFile) ||
          [...fileMap.entries()].find(([k]) => k.toLowerCase().endsWith(texFile.toLowerCase()))?.[1];
  
        if (matchedUrl) {
          const mat = new StandardMaterial(`daeTex_${matName}`, scene);
          mat.diffuseTexture = new Texture(matchedUrl, scene);
          mesh.material = mat;
          appliedAny = true;
          console.log(`🎯 Applied texture to "${mesh.name}" using material "${matName}"`);
          showBottomPopup("No texture found in DAE , Guess applying colors",4000);
        } else {
          console.warn(`❌ Texture file "${texFile}" for "${matName}" not found in fileMap`);
        }
      } else {
        console.warn(`⚠️ No texture found for mesh "${mesh.name}" with material "${matName}"`);
      }
    }
    return appliedAny;
  }
