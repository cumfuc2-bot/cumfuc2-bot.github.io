import * as THREE from 'three';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18.2/dist/lil-gui.esm.min.js';

// ----- Global Setup -----
const loader = new THREE.TextureLoader();
const scene = new THREE.Scene();

// Create renderer with transparency and add it to the page
const renderer = new THREE.WebGLRenderer({ alpha: true });
document.body.style.margin = '0'; // Remove default margins
document.body.appendChild(renderer.domElement);

// We'll create a default camera here; its frustum will be updated after loading the base image.
let camera = new THREE.OrthographicCamera(-400, 400, 400, -400, 0.1, 10);
camera.position.z = 5;

// ----- Base Body Setup -----
// Create a base mesh (using a unit plane that we'll scale when the texture loads)
const baseMaterial = new THREE.MeshBasicMaterial({ transparent: true });
const basePlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), baseMaterial);
basePlane.position.set(0, 0, 0); // Base at z=0
scene.add(basePlane);

// Load the base body image, then update the plane, renderer, and camera
loader.load('src/base_body.png', texture => {
  const width = texture.image.width;
  const height = texture.image.height;
  
  // Set the base texture and update its material
  baseMaterial.map = texture;
  baseMaterial.needsUpdate = true;
  
  // Scale the base plane to its natural dimensions
  basePlane.scale.set(width, height, 1);
  
  // Update renderer size so that it matches the base image dimensions
  renderer.setSize(width, height);
  
  // Update the camera's orthographic frustum to exactly fit the base image.
  // We position the camera so that (0,0) is at the center.
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
});

// ----- Parts Setup -----
// Define the parts and a selections object for GUI control
const parts = {
  head: [],
  top: [],
  bottom: [],
  face: []
};
const selections = { head: 1, top: 1, bottom: 1, face: 1 };

for (let i = 1; i <= 9; i++) {
  parts["bottom"].push(`src/bottom/${i}.png`);
}
for (let i = 1; i <= 21; i++) {
  parts["face"].push(`src/face/${i}.png`);
}
for (let i = 1; i <= 18; i++) {
  parts["head"].push(`src/head/${i}.png`);
}
for (let i = 1; i <= 21; i++) {
  parts["top"].push(`src/top/${i}.png`);
}

// Create meshes for each part. We want them to overlay the base image.
// We use a mapping for z-order so that the base is at the back and the parts overlay in the proper order.
const zOrder = { bottom: 1, top: 2, head: 3, face: 4 };
const layers = {};
['head', 'top', 'bottom', 'face'].forEach(part => {
  const material = new THREE.MeshBasicMaterial({ transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  
  // Center the mesh (PlaneGeometry's origin is centered) and assign a z value based on its layer.
  mesh.position.set(0, 0, zOrder[part]);
  scene.add(mesh);
  layers[part] = mesh;
});

// ----- Functions to Update Textures -----
// Update a single part's texture (and scale its mesh to the texture's natural size)
function updateLayer(part) {
  const imagePath = parts[part][selections[part]];
  loader.load(imagePath, texture => {
    layers[part].material.map = texture;
    layers[part].material.needsUpdate = true;
    // Scale the mesh to match the image's original size
    layers[part].scale.set(texture.image.width, texture.image.height, 1);
  });
}

// Update all part textures
function updateTextures() {
  ['head', 'top', 'bottom', 'face'].forEach(part => {
    updateLayer(part);
  });
}

// Randomize each part selection and update textures
function randomize() {
  ['head', 'top', 'bottom', 'face'].forEach(part => {
    selections[part] = Math.floor(Math.random() * parts[part].length);
  });
  updateTextures();
}

// ----- GUI Setup -----
// Use lil-gui to provide sliders (with arrow controls) and a randomize button
const gui = new GUI();
['head', 'top', 'bottom', 'face'].forEach(part => {
  gui.add(selections, part, 1, parts[part].length - 1, 1)
     .name(part)
     .onChange(updateTextures);
});
gui.add({ randomize }, 'randomize').name('Random Outfit');

// ----- Initial Texture Update -----
updateTextures();

// ----- Animation Loop -----
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();