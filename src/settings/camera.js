
import {
    ArcRotateCamera,
    Vector3,
    CubeTexture

} from "@babylonjs/core";
import * as Settings from "./Settings";


const scene = Settings.scene;
const canvas = Settings.canvas;
const engine = Settings.engine;

/* const envTexture = CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
scene.environmentTexture = envTexture;
scene.createDefaultSkybox(envTexture, true, 1000,0.25);  */

let currentSkybox = null;
const skyboxSelector = document.getElementById("skyboxSelector");
const toggleSkyboxBtn = document.getElementById("toggleSkyboxBtn");

toggleSkyboxBtn.addEventListener("click", () => {
  const value = skyboxSelector.value;

  if (currentSkybox) {
    currentSkybox.dispose();
    currentSkybox = null;
    scene.environmentTexture = null;
  }

  if (!value) {
    console.log("🌌 Skybox removed.");
    return;
  }

  let url;
  switch (value) {
    case "studio":
      url = "https://assets.babylonjs.com/environments/studio.env";
      break;
    case "environment":
      url = "https://playground.babylonjs.com/textures/environment.env";
      break;
    case "specular":
      url = "https://assets.babylonjs.com/environments/specular.env";
      break;
  }

  currentSkybox = CubeTexture.CreateFromPrefilteredData(url, scene);
  scene.environmentTexture = currentSkybox;
  scene.createDefaultSkybox(currentSkybox, true, 50);
  scene.environmentIntensity = 1.2;

  console.log(`✅ Skybox "${value}" applied`);
});

const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 10, Vector3.Zero(), scene);
camera.lowerRadiusLimit = 0.01;
camera.upperRadiusLimit = 10;
camera.minZ = 0.01; // Smaller near clipping plane
camera.maxZ = 5; 
camera.allowUpsideDown = true;
camera.panningSensibility = 50;
camera.inertialRadiusOffset = 0.1;
camera.useAutoRotationBehavior = false;
camera.wheelDeltaPercentage = 0.01;
camera.attachControl(canvas, true);

const initialCameraState = {
  alpha: camera.alpha,
  beta: camera.beta,
  radius: camera.radius,
  target: camera.target.clone(), // clone to avoid reference mutation
};

export{camera}