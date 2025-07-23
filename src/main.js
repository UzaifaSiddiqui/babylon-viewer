console.log("Main Working");
import {
    SceneLoader,
    HemisphericLight,
    DirectionalLight,
    Vector3,
    CubeTexture,
} from "@babylonjs/core";
import * as Settings from "./settings/Settings";
import "./core/FileManager";
import { fileMap } from "./core/Loader";
import {togglePanelButton, sidePanel} from "./ui/UI";

//Upload Button to refresh the scene

const button = document.getElementById("newModel");
button.addEventListener("click", () => {
  Settings.clearSceneMeshes();
  fileMap.clear();
  togglePanelButton.style.display = "none";
  sidePanel.classList.remove("active");
  document.getElementById("drop-zone").style.display = "flex";
});


const scene = Settings.scene;
const engine = Settings.engine;

SceneLoader.ShowLoadingScreen = false;



const hdrTexture = CubeTexture.CreateFromPrefilteredData(
  "https://playground.babylonjs.com/textures/environment.env",
  scene
);
scene.environmentTexture = hdrTexture;
scene.environmentIntensity = 1.2; // Sketchfab style reflections

const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
hemiLight.intensity = 1; // Max ambient light

// Directional light (sunlight)
const dirLight = new DirectionalLight("dir", new Vector3(-1, -2, -1), scene);
dirLight.position = new Vector3(40, 60, 40);
dirLight.intensity = 1;











Settings.engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

