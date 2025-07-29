
import {
  Vector3,
  Color4,
  Color3,
  StandardMaterial,
  PBRMaterial,
  Texture,
} from "@babylonjs/core"; 
function showLoader(message = "Loading model...") {
    const loader = document.getElementById("custom-loader");
    loader.querySelector(".loader-text").textContent = message;
  
    setTimeout(() => {
      loader.style.display = "flex";
      requestAnimationFrame(() => {
        loader.style.opacity = "1";
      });
    }, 100); // Delay for smooth UX
}
  
function hideLoader() {
    const loader = document.getElementById("custom-loader");
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
    }, 500); // matches transition time
} 

const togglePanelButton = document.getElementById("togglePanelBtn");
const sidePanel = document.getElementById("side-panel");
togglePanelButton.addEventListener("click", () => {
  sidePanel.classList.toggle("active");
});

function injectSTLColorOption(panel, scene, stlMesh) {
  // Clear previous STL color block if it exists
  const existing = document.getElementById("stlColorBlock");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "stlColorBlock";
  wrapper.style.marginTop = "15px";
  wrapper.style.paddingTop = "10px";
  wrapper.style.borderTop = "1px solid #ccc";

  const title = document.createElement("h4");
  title.textContent = "STL Color Assignment";
  wrapper.appendChild(title);

  const label = document.createElement("label");
  label.textContent = "Pick Color:";
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = "color";
  input.value = "#ff0000";
  wrapper.appendChild(input);

  const btn = document.createElement("button");
  btn.textContent = "Apply Color";
  btn.style.marginLeft = "10px";
  wrapper.appendChild(btn);

  btn.addEventListener("click", () => {
    const color = hexToBabylonColor3(input.value);
    const mat = new StandardMaterial("stlMat", scene);
    mat.diffuseColor = color;
    stlMesh.material = mat;
    console.log("✅ STL color applied:", input.value);
  });

  panel.appendChild(wrapper);
}

function hexToBabylonColor3(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

function showBottomPopup(message, duration = 3000) {
  const container = document.getElementById("popup-container");

  const popup = document.createElement("div");
  popup.classList.add("popup-message");
  popup.textContent = message;
  container.appendChild(popup);

  // Trigger CSS animation
  requestAnimationFrame(() => {
    popup.classList.add("show");
  });

  // Remove after duration
  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => popup.remove(), 300); // Remove from DOM after transition
  }, duration);
}

/* document.getElementById('newModel').addEventListener('click', () => {
  document.getElementById('folderOpener').click();
});

// Don't process the files — let the user drag and drop manually.
document.getElementById('folderOpener').addEventListener('change', () => {
  alert("✅ Folder opened. Now drag and drop the files into the viewer.");
}); */

export { showLoader, hideLoader , togglePanelButton , sidePanel ,injectSTLColorOption ,  showBottomPopup};