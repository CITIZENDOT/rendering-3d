import * as THREE from "three";
import { DRACOLoader } from "DRACOLoader";
import { initialize, animate } from "./OBJ-render.js";

const [camera, scene, renderer, orbitControls] = initialize(1);

const loader = new DRACOLoader();
loader.setDecoderPath("http://localhost:8000/draco-decoder-static/");
loader.preload();

loader.load(
  "http://localhost:8000/mech_drone.drcs" /* resource URL */,
  function (geometry) {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "model";
    scene.add(mesh);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  function (error) {
    console.log("Error occured: ", error);
  }
);

animate(camera, scene, renderer, orbitControls);
