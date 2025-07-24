//FileManager
console.log("FileManager Works");

import { updateFileData, loadModel } from "./Loader.js";
import {convertDAEToGLB} from "../DaetoGlb/Converter.js";
import {loadData} from "../settings/systemManager.js";

let fileMap = new Map();
let parsingText;
let gltfParsingText;
let convertedFile = "";

const dropZone = document.getElementById("drop-zone");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const items = e.dataTransfer.items;
  const fileEntries = [];

  async function traverseDirectory(item, path = "") {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          const fullPath = path + file.name;
          const parts = fullPath.split("/");
          let trimmedPath;
          
          if (parts.length === 1) {
            trimmedPath = parts[0];
          } else if (parts.length > 1 && parts.length < 3) {
            trimmedPath = parts.slice(1).join("/");
          } else if (parts.length >= 3) {
            trimmedPath = parts.slice(2).join("/");
          }
          
          console.log("trimmedPath", trimmedPath);
          fileEntries.push({ file, relativePath: trimmedPath });
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries) => {
          for (const entry of entries) {
            await traverseDirectory(entry, path + item.name + "/");
          }
          resolve();
        });
      }
    });
  }

  const traversePromises = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry();
    if (entry) {
      traversePromises.push(traverseDirectory(entry));
    }
  }
  
  await Promise.all(traversePromises);
  
  // Process the files and load the model
  const result = await loadFolderFiles(fileEntries);
  if (result) {
    // Update the loader with the new file data
    updateFileData(result.fileMap, result.extension, result.modelPathBlobUrl);
    // Load the model
    await loadModel();
    await loadData(result.extension, result.fileMap, result.modelPathBlobUrl);
  }
});

async function loadFolderFiles(files) {
  fileMap.clear();

  console.log("Processing files...");

  for (const { file, relativePath } of files) {
    let finalBlob = file;
    let finalPath = relativePath;
  
    if (relativePath.endsWith(".dae")) {
      convertedFile = ".dae";
      try {
        console.log(`⏳ Converting DAE: ${relativePath}`);
        const { blob, filename, mimeType , parsingText} = await convertDAEToGLB(file);

        finalBlob = new File([blob], filename, { type: mimeType });
        finalPath = filename;

        console.log("finalBlob: ",finalBlob);
        console.log("finalPath: ",finalPath);
  
        files.push({ file: finalBlob, relativePath: finalPath });
        console.log(`✅ DAE converted to GLB: ${filename}`);
      } catch (err) {
        console.error(`❌ Failed to convert DAE: ${relativePath}`, err);
        continue; // skip this file
      }
    }
    if (relativePath.endsWith(".gltf")){
        gltfParsingText = await file.text();
    }
  
    const blobUrl = URL.createObjectURL(finalBlob);
    fileMap.set(finalPath, blobUrl);
  }

  console.log("fileMap", fileMap);

  const modelPath = [...fileMap.keys()].find((name) =>
    name.endsWith(".gltf") || name.endsWith(".glb") || name.endsWith(".obj") || name.endsWith(".dae") || name.endsWith(".stl") || name.endsWith(".ply")|| name.endsWith(".splat")
  );

  console.log("model path: " ,modelPath );

  if (!modelPath) {
    console.log("❌ No model file (.gltf, .glb, .obj, .dae,.stl,.ply) found in folder.");
    return null;
  }
  console.log("files: ",files);

  // ✅ Get the corresponding File object
  const modelFile = files.find(f => f.relativePath === modelPath)?.file;

  if (!modelFile) {
    console.error("❌ Could not find File object for modelPath.");
    return null;
  }

  const buffer = await modelFile.arrayBuffer();
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const modelPathBlobUrl = URL.createObjectURL(blob);
  console.log("✅ modelPathBlobUrl", modelPathBlobUrl);

  const extension = modelPath.slice(modelPath.lastIndexOf(".")).toLowerCase();

  return { fileMap, extension, modelPathBlobUrl };
}


// Export functions for external use
export { loadFolderFiles, fileMap as getFileMap , parsingText, gltfParsingText,convertedFile};
