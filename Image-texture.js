import * as THREE from "three";
import { OrbitControls } from "OrbitControls";

function initialize(nodeIndex) {
  const scene = new THREE.Scene();
  const SCENE_WIDTH = 0.4;
  const SCENE_HEIGHT = 0.8;
  const camera = new THREE.PerspectiveCamera(
    30,
    (window.innerWidth * SCENE_WIDTH) / (window.innerHeight * SCENE_HEIGHT),
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(
    window.innerWidth * SCENE_WIDTH,
    window.innerHeight * SCENE_HEIGHT
  );

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  camera.position.z = 5;
  orbitControls.update();

  const container =
    document.getElementsByClassName("canvas-container")[nodeIndex];
  container.appendChild(renderer.domElement);
  return [camera, scene, renderer, orbitControls];
}

function animate(camera, scene, renderer, orbitControls) {
  requestAnimationFrame(function (timestamp) {
    animate(camera, scene, renderer, orbitControls);
  });

  const model = scene.getObjectByName("model");
  if (model) {
    model.rotation.x += 0.01;
    model.rotation.y += 0.01;
  }
  orbitControls.update();

  renderer.render(scene, camera);
}

function loadImageTexture(loader, url, materials) {
  loader.load(
    url,
    function (texture) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      materials.push(material);
      materials.push(material); // pushing twice because, there are 3 images for 6 sides.
    },
    undefined,
    function (error) {
      console.log("Error occured: ", error);
    }
  );
}

function addCube(scene, texture) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const cube = new THREE.Mesh(geometry, texture);
  cube.name = "model";
  scene.add(cube);
}

const [camera, scene, renderer, orbitControls] = initialize(0);
const materials = [];
const loader = new THREE.TextureLoader();

loadImageTexture(
  loader,
  "http://localhost:8000/images/01-cat-1000x1000.jpg",
  materials
);
loadImageTexture(
  loader,
  "http://localhost:8000/images/02-cat-2948x2948.jpg",
  materials
);
loadImageTexture(
  loader,
  "http://localhost:8000/images/03-prism-3417x3417.jpg",
  materials
);

addCube(scene, materials);
animate(camera, scene, renderer, orbitControls);

export { initialize, addCube, animate };
