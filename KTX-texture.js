import * as THREE from "three";
import { initialize, addCube, animate } from "./Image-texture.js";
import { KTX2Loader } from "KTX2Loader";

const [camera, scene, renderer, orbitControls] = initialize(1);

var ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("http://localhost:8000/ktx2-transcoder-static");
ktx2Loader.detectSupport(renderer);

var material = null;
ktx2Loader.load(
  "http://localhost:8000/cat-texture.ktx2",
  function (texture) {
    material = new THREE.MeshStandardMaterial({ map: texture });
    addCube(scene, material);
  },
  function () {
    console.log("onProgress");
  },
  function (error) {
    console.log("Error occured: ", error);
  }
);

animate(camera, scene, renderer, orbitControls);
