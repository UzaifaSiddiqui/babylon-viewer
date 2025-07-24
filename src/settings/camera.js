
import {
    ArcRotateCamera,
    Vector3,
    CubeTexture

} from "@babylonjs/core";
import * as Settings from "./setting";


const scene = Settings.scene;
const canvas = Settings.canvas;
const engine = Settings.engine;




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