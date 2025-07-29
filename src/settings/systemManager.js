console.log("system manager is working!");
import { showBottomPopup } from "../ui/UI.js";


let panel = document.querySelector("#toggleTexturePanel");
export async function loadData(extension, fileMap, modelPathBlobUrl , isConverted) {

    console.log("is converted: ", isConverted);

    if (!modelPathBlobUrl || !extension) {
        console.warn("⚠️ Files not ready yet.");
        return;
    }

    if (extension === ".gltf" && !isConverted) {
        if (panel) panel.style.display = "none";
    }

    if (extension === ".stl" || extension ===".splat" || extension ===".ply"){

        if (extension ===".stl"){
                    // texture panel
        if (panel) panel.style.display = "none";

        // materials button
        const materials = document.getElementById("materials");
        if (materials) materials.style.display = "none";

        // Uv buttons
        const uv = document.getElementById("uv");
        if (uv) uv.style.display = "none";

        // turning display off every button except for wireframe is geometry
        const toggleMatcapBtn = document.getElementById("toggleMatcap");
        if (toggleMatcapBtn) toggleMatcapBtn.style.display = "none";

        // turning off wireframe
        const geometry = document.getElementById("geometry");
        if (geometry) geometry.style.display = "none"; 

        const wireframeColors = document.getElementById("wireframeColors");
        if (wireframeColors) wireframeColors.style.display = "none"; 


        }else{
            const togglePanelBtn= document.getElementById("togglePanelBtn");
            if (togglePanelBtn) togglePanelBtn.style.display = "none";
        }

    }
    if (extension === ".obj"){
        let hasMtl = false
        for (let key of fileMap.keys()){
            let keys = key.split(".");
            if (keys[1] === "mtl"){
                hasMtl = true;
                break;
            }
        }
        if (!hasMtl){
            console.log("hasMtl: ",hasMtl);
            showBottomPopup("mtl file not found!", 5000)
        }else{
            console.log("hasMtl: ",hasMtl);
            showBottomPopup("mtl file found!",  5000)
        }
    }
}





