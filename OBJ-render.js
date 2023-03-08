import * as THREE from "three";
import { OBJLoader } from "OBJLoader";
import { OrbitControls } from "OrbitControls";

function initialize(nodeIndex) {
  const scene = new THREE.Scene();
  /* defines how much width and height this renderer occupies.
   * ranges from 0 to 1 */
  const SCENE_WIDTH = 0.4;
  const SCENE_HEIGHT = 0.8;
  const camera = new THREE.PerspectiveCamera(
    10,
    (window.innerWidth * SCENE_WIDTH) / (window.innerHeight * SCENE_HEIGHT),
    0.1,
    1000
  );

  const hsLight = new THREE.HemisphereLight(0x443333, 0x111122);
  scene.add(hsLight);

  const spotLight = new THREE.SpotLight();
  spotLight.angle = Math.PI / 16;
  spotLight.penumbra = 0.5;
  spotLight.castShadow = true;
  spotLight.position.set(-1, 1, 1);
  scene.add(spotLight);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(
    window.innerWidth * SCENE_WIDTH,
    window.innerHeight * SCENE_HEIGHT
  );
  renderer.domElement.className = "col";

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
    model.rotation.z += 0.01;
  }
  orbitControls.update();

  renderer.render(scene, camera);
}

const [camera, scene, renderer, orbitControls] = initialize(0);

const loader = new OBJLoader();
loader.load(
  "http://localhost:8000/mech_drone.obj" /* resource URL */,
  function (object) {
    object.name = "model";
    scene.add(object);
    object.traverse(function (node) {
      if (node.isMesh) {
        console.log(node.name);
      }
    });
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  function (error) {
    console.log("Error occured: ", error);
  }
);

animate(camera, scene, renderer, orbitControls);

export { initialize, animate };
