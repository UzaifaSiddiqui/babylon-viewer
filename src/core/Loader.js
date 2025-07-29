//Loader
console.log("Loader Working");
import {
    SceneLoader,
    Tools,
    CubeTexture,
    StandardMaterial,
    Color3,
    PBRMaterial,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
registerBuiltInLoaders();

//import settings folder
import * as Settings from "../settings/setting.js";
import {camera} from "../settings/camera.js";
import {fallBackMaterial , createTextureAssignmentUI , applyMTLTextures , remapper , applyDAETextures} from "../settings/Textures.js";

//import from core
import * as FileManager from "./FileManager.js"
import { focusCamera } from "./SceneUtils.js";

//import from UI
import { showLoader, hideLoader , togglePanelButton , sidePanel , injectSTLColorOption , showBottomPopup} from "../ui/UI.js"

const scene = Settings.scene;
const canvas = Settings.canvas;
const engine = Settings.engine;

// Global variables to store file data
let fileMap = new Map();
let extension = "";
let modelPathBlobUrl = "";
let mtlFlag = true;
let isRequestingTga = false;

let animGroups = [];

let startedGroups = new WeakMap(); // 💡 tracks started status

document.getElementById("playAnim").addEventListener("click", () => {
    console.log("▶️ Playing animation");
    animGroups.forEach(group => {
        if (group.isPaused) {
            group.play(); // ✅ resume paused animation
        } else if (!startedGroups.get(group)) {
            group.start(true); // ✅ start only once
            startedGroups.set(group, true);
        } else {
            group.play(); // fallback
        }
    });
});

document.getElementById("pauseAnim").addEventListener("click", () => {
    console.log("⏸️ Pausing animation");
    animGroups.forEach(group => group.pause());
});

document.getElementById("resetAnim").addEventListener("click", () => {
    console.log("🔁 Resetting animation");
    animGroups.forEach(group => {
        group.reset();
        startedGroups.set(group, false); // 🧹 reset state
    });
});

function checkAnimation(){
    const animationGroups = scene.animationGroups;
    const hasSkeleton = scene.skeletons.length > 0;
    const isAnimated = animationGroups.length > 0;

    console.log("💀 Skeletons:", scene.skeletons.length);
    console.log("🎬 Animations:", animationGroups.length);

    if (isAnimated) {
        document.querySelector("#toggleMatcap").style.display = "none";
        document.getElementById("playAnim").style.display = "flex";
        document.getElementById("pauseAnim").style.display = "flex";
        document.getElementById("resetAnim").style.display = "flex";

        animationGroups.forEach(group => group.stop());

        if (!hasSkeleton) {
            showBottomPopup("Animation is present but no skeletons found — might be keyframe-based.",4000);
        }
    }
}


class WebRequest {
    constructor() {
        this._xhr = new XMLHttpRequest();
        this._requestURL = "";
    }

    static CustomRequestHeaders = {};
    static CustomRequestModifiers = [];
    static SkipRequestModificationForBabylonCDN = true;

    _shouldSkipRequestModifications(url) {
        return WebRequest.SkipRequestModificationForBabylonCDN &&
            (url.includes("preview.babylonjs.com") || url.includes("cdn.babylonjs.com"));
    }

    _injectCustomRequestHeaders() {
        if (this._shouldSkipRequestModifications(this._requestURL)) return;
        for (const key in WebRequest.CustomRequestHeaders) {
            const val = WebRequest.CustomRequestHeaders[key];
            if (val) this._xhr.setRequestHeader(key, val);
        }
    }

    open(method, url) {
        WebRequest.CustomRequestModifiers.forEach(mod => {
            if (!this._shouldSkipRequestModifications(url)) {
                mod(this._xhr, url);
            }
        });
        url = url.replace("file:http:", "http:").replace("file:https:", "https:");
        this._requestURL = url;
        this._xhr.open(method, url, true);
    }

    send(body = null) {
        this._injectCustomRequestHeaders();
        this._xhr.send(body);
    }

    setRequestHeader(name, value) {
        this._xhr.setRequestHeader(name, value);
    }

    getResponseHeader(name) {
        return this._xhr.getResponseHeader(name);
    }

    addEventListener(...args) { this._xhr.addEventListener(...args); }
    removeEventListener(...args) { this._xhr.removeEventListener(...args); }
    abort() { this._xhr.abort(); }

    get onprogress() { return this._xhr.onprogress; }
    set onprogress(v) { this._xhr.onprogress = v; }
    get readyState() { return this._xhr.readyState; }
    get status() { return this._xhr.status; }
    get statusText() { return this._xhr.statusText; }
    get response() { return this._xhr.response; }
    get responseText() { return this._xhr.responseText; }
    get responseURL() { return this._xhr.responseURL; }
    get responseType() { return this._xhr.responseType; }
    set responseType(val) { this._xhr.responseType = val; }
    get timeout() { return this._xhr.timeout; }
    set timeout(val) { this._xhr.timeout = val; }
}

export function updateFileData(newFileMap, newExtension, newModelPathBlobUrl) {
    fileMap = newFileMap;
    extension = newExtension;
    modelPathBlobUrl = newModelPathBlobUrl;
}

export async function loadModel() {
    console.log("modelPathBlobUrl", modelPathBlobUrl);
    console.log("extension", extension);
    console.log("fileMap", fileMap);

    if (!modelPathBlobUrl || !extension) {
        console.warn("⚠️ Files not ready yet.");
        return;
    }

// Override Tools.LoadFile to use our file mapping
Tools.LoadFile = function (
    url,
    onSuccess,
    onProgress,
    offlineProvider,
    useArrayBuffer,
    onError,
    onOpened
  ) {
    const short = url.split("/").pop(); // Get just the filename (e.g., geo_dead.mtl)
    const keys = [...fileMap.keys()];
  
    // Try multiple matching methods
    const fullMatch = fileMap.get(url);
    const shortMatch = fileMap.get(short);
    const fuzzyMatch = keys.find(k => k.endsWith(short));
    const actualUrl = fullMatch || shortMatch || (fuzzyMatch ? fileMap.get(fuzzyMatch) : null) || url;


/*     if (url.toLowerCase().endsWith(".tga")) {
        console.warn("🚫 TGA texture requested:", url);
        showBottomPopup("TGA textures are not supported in browser. Please convert to PNG.",4000);
        alert("⚠️ TGA textures are not supported in browser. Please convert to PNG.");
    } */
  
    console.log("📦 Intercepted LoadFile:  hello", url, "→", actualUrl);
  
    if (!fileMap.has(url) && !fileMap.has(short)) {
      console.warn("🛑 Missing mapping for:", url);
      mtlFlag = false;
    }
  
    const request = new XMLHttpRequest();
    request.open("GET", actualUrl, true);
    if (onOpened) onOpened(request);
    if (onProgress) request.onprogress = onProgress;
    request.responseType = useArrayBuffer ? "arraybuffer" : "";
  
    request.addEventListener("load", () => onSuccess && onSuccess(request));
    request.addEventListener("error", () => {
        console.warn("🛑 Suppressed LoadFile error (file not found):", actualUrl);
        if (onError) onError(request);
      });
    request.send();
  };


if (extension === ".obj"){
    let objText = await fetch(modelPathBlobUrl).then(res => res.text());
    const hasMTL = objText.toLowerCase().includes("mtllib");
    if (!hasMTL) {
    const mtlFileName = [...fileMap.keys()].find(k => k.endsWith(".mtl"));
    if (mtlFileName) objText = `mtllib ${mtlFileName}\n` + objText;
    }
    const cleanedBlob = new Blob([objText], { type: "text/plain" });
    modelPathBlobUrl = URL.createObjectURL(cleanedBlob); 

    await remapper(fileMap);
}


// Setup scene loader plugins
SceneLoader.OnPluginActivatedObservable.clear();
 SceneLoader.OnPluginActivatedObservable.add((plugin) => {
    plugin.preprocessUrlAsync = async (url) => {
        console.log("Requested URL:", url);
        // Extract relative path from the full URL or blob reference
        const keys = Array.from(fileMap.keys());
        const matchingKey = keys.find(key => url.endsWith(key));

        if (!matchingKey) {
            console.error("❌ Not found in fileMap:", url);
            return url; // Fallback to original URL (may still error)
        }

        return fileMap.get(matchingKey); // Return the correct blob URL
    };
    
    if (plugin.name === "obj") {
        const originalLoad = plugin._loadMTL.bind(plugin);
        plugin._loadMTL = function (url, rootUrl, onSuccess) {
            Tools.LoadFile(
                url,
                (request) => {
                    let text = request.responseText;

                    // 🔁 Rewrite texture filenames
                    const keys = [...fileMap.keys()];
                    text = text.replace(/^map_Kd\s+(.+)$/gm, (match, filename) => {
                        const base = filename.trim().split("/").pop();

                        if (base.toLowerCase().endsWith(".tga")) {
                            console.warn(`🚫 .tga texture referenced in .mtl: ${base}`);
                            isRequestingTga = true;
                            showBottomPopup("This model references a .tga texture, which may not be supported in your browser.", 4000);
                        }

                        const pngAlt = base.replace(".tga", ".png");
                        const keys = [...fileMap.keys()];
                    
                        const realKey = keys.find(k => k.endsWith(pngAlt) || k.endsWith(base));
                        if (realKey) {
                            console.log(`🔄 Remapping texture in .mtl: ${base} → ${realKey}`);
                            return `map_Kd ${realKey}`;
                        } else {
                            console.warn(`⚠️ Texture not found in fileMap: ${base}`);
                            return `# map_Kd ${base}  <-- Skipped: not found`;
                        }
                    });
                    onSuccess(text); // ← Use raw text, no patching
                },
                undefined,
                undefined,
                false,
                () => {
                    console.warn("⚠️ MTL file not found or failed to load:", url);
                    mtlFlag = false;
                }
            );
        };
    }
}); 

    let daeSuccess = false;
    let shouldAssignMaterial;
    showLoader("Loading Model...");

    try {
        await SceneLoader.AppendAsync(modelPathBlobUrl, "", scene, undefined, extension);
        console.log("👀 Mesh count:", scene.meshes.length);
        scene.meshes.forEach(mesh => {
/*             if (mesh.material) Settings.originalMaterials.push(mesh);
            mesh.isVisible = true; */
            Settings.meshList.push(mesh);
            //console.log("mtlflag: ",mtlFlag);
        });
    
        let texturedCount = 0;
        let untexturedCount = 0;

        scene.meshes.forEach(mesh => {
        if (mesh.material) {
            texturedCount++;
            Settings.originalMaterials.push(mesh);
        } else {
            untexturedCount++;
            Settings.untexturedMeshes.push(mesh);
        }
        });
        console.log(`✅ Model loaded. ${texturedCount} with textures, ${untexturedCount} without.`);
  
        if (FileManager.convertedFile ===".dae"){
            console.log("going for conversion of .dae")
            daeSuccess = await applyDAETextures(scene,fileMap,FileManager.parsingText)
        }else{

            shouldAssignMaterial = scene.meshes.every(m => !m.material);
        }

        if (extension === ".obj"){
            //await remapper(fileMap);
            setTimeout(async () => {
                await applyMTLTextures(scene, fileMap);
                Settings.checkAnyTextures(scene,Settings.flags);
                Settings.checkingForPresentTexture(Settings.flags);
              }, 100); // Or even use requestAnimationFrame for more reliability

              scene.meshes.forEach(mesh => {
              Settings.originalMaterials.push(mesh);   

            });     
        }

        if (extension === ".stl"){
            const panel = document.getElementById("texturePanel");
            scene.meshes.forEach(mesh =>{
                injectSTLColorOption(sidePanel, scene, mesh);
            });
        }

        
        if ((shouldAssignMaterial) || (mtlFlag === false)) {
            showBottomPopup("Fallback material applied: original textures were missing or failed to load.", 4000);
            fallBackMaterial(fileMap,scene);
        } 

        animGroups = scene.animationGroups;
        startedGroups = new WeakMap();

        

        document.getElementById("drop-zone").style.display = "none";
        console.log("✅ Model loaded.");
        hideLoader();
        togglePanelButton.style.display = "flex";
        const originalMaterialsWithClones = Settings.originalMaterials.map(mesh => ({
            mesh,
            material: mesh.material?.clone("original_" + mesh.name) || null
        }));
        createTextureAssignmentUI(fileMap,originalMaterialsWithClones,scene);
        focusCamera(scene.meshes, camera);
        Settings.checkAnyTextures(scene,Settings.flags);
        Settings.checkingForPresentTexture(Settings.flags);
        checkAnimation()
    } catch (err) {
        console.error("❌ Failed to load:", err);
    }
}

window.addEventListener("pauseAndReset", () => {
    if (!animGroups || animGroups.length === 0) return;

    console.log("🔁 [Event] Resetting & Pausing animations due to toggle");

    animGroups.forEach(group => {
        group.reset();         // ⏮️ Reset to first frame
        group.pause();         // ⏸️ Make sure it doesn't start again
        startedGroups.set(group, false); // 🧹 Clean started state
    });
});

export{fileMap}