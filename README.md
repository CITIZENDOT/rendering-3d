# Rendering 3D models with Three.js

In this repo, we'll play with geometry data, texture data and compare various methods to encode them in terms of efficiency (in size).

## Geometry data

### Development setup

- First grab some OBJ file.
  - I'm using [this](https://sketchfab.com/3d-models/mech-drone-8d06874aac5246c59edb4adbe3606e0e) model. I've converted GLTF to OBJ in blender and using it, But you can directly download OBJ file from elsewhere.
- Compress it with DRACO encoder.
  - You've to build the DRACO library to get the encoder and decoder executables. I'm providing my encoder [here](draco_encoder-1.5.6) (compatible with Linux 64-bit).
- Start a local http server (with CORS enabled) to serve OBJ and DRCS files. [Read here to know why.](https://threejs.org/docs/index.html#manual/en/introduction/How-to-run-things-locally)
  - My http server was running at localhost:8000, Change it accordingly, at the resource URL in the scripts.
- Start a live server for development to see the results.

### Demo

https://user-images.githubusercontent.com/52322531/223734728-21195ad4-fff7-47fe-a277-3968513d9d5f.mp4

## Texture data

We're using 3 JPEGs of different dimensions as texture for a cube (6 sides). (There is little trouble with KTX2, For some reason, Three.js KTX2Loader is not recognizing the KTX2 file format.)

### Demo

https://user-images.githubusercontent.com/52322531/224489838-3316d698-f55b-4d96-a684-ee2e1d1ed180.mp4
