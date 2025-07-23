import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';


export async function convertDAEToGLB(file) {
  let parsingText = await file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const contents = e.target.result;

      if (!contents.trim().startsWith("<")) {
        return reject("Invalid DAE: Not valid XML");
      }

      try {
        const loader = new ColladaLoader();
        const collada = loader.parse(contents);
        const scene = collada.scene;

        const exporter = new GLTFExporter();
        exporter.parse(
          scene,function(result) {
            let blob;
            let filename;
            let mimeType;
            
            if (result instanceof ArrayBuffer) {
              // ✅ It is GLB binary
              blob = new Blob([result], { type: "model/gltf-binary" });
              filename = file.name.replace(".dae", ".glb");
              mimeType = "model/gltf-binary";
              console.log("👀 Result type:", result instanceof ArrayBuffer ? "GLB" : "JSON glTF");
            } else {
              // ❌ It's glTF JSON
              console.warn("⚠️ Exported as JSON glTF instead of binary GLB.");
              blob = new Blob([JSON.stringify(result)], { type: "application/json" });
              filename = file.name.replace(".dae", ".gltf");
              mimeType = "application/json";
              console.log("👀 Result type:", result instanceof ArrayBuffer ? "GLB" : "JSON glTF");
            }
            resolve({ blob, filename, mimeType , parsingText});
          },
          { binary: true }
        );
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsText(file);
  });
}

