import { type Texture, TextureLoader } from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { type VideoTextureSource, createVideoTexture } from "@app/utils/textures";

import {
  type LoadedAssets,
  type LoadedCallback,
  type NestedPaths,
  asyncLoadResources
} from "@app/assets/resources";

/**
 * Loads multiple GLTF models asynchronously.
 *
 * @param paths - An object containing paths to the GLTF models.
 * @param onJustLoaded - Optional callback function that is called when each model is loaded.
 * @returns A promise that resolves to an object containing the loaded models, with keys corresponding to the input paths.
 */
export async function loadModels<TPaths extends NestedPaths<TPaths>>(
  paths: TPaths,
  onJustLoaded?: LoadedCallback<GLTF>
): Promise<LoadedAssets<TPaths, GLTF>> {
  const { gltfLoader, cleanup } = getModelLoader();

  // We return our own promise to invoke the cleanup function after load.
  return new Promise((resolve, reject) => {
    asyncLoadResources(paths, gltfLoader, onJustLoaded)
      .then((models) => {
        resolve(models);
        cleanup();
      })
      .catch(reject);
  });
}

/**
 * Loads textures from the specified paths asynchronously.
 *
 * @param paths - An object containing the paths of the textures to load.
 * @param onJustLoaded - An optional callback function that is called when each texture is loaded.
 * @returns A promise that resolves to an object containing the loaded textures.
 */
export async function loadTextures<TPaths extends NestedPaths<TPaths>>(
  paths: TPaths,
  onJustLoaded?: LoadedCallback<Texture>
) {
  const textureLoader = new TextureLoader();
  return asyncLoadResources(paths, textureLoader, onJustLoaded);
}

/**
 * Loads videos asynchronously based on the provided paths.
 *
 * @param paths - The paths of the videos to be loaded.
 * @param onJustLoaded - Optional callback function that is called when each video is loaded.
 * @returns A promise that resolves when all videos are loaded.
 */
export async function loadVideos<TPaths extends NestedPaths<TPaths>>(
  paths: TPaths,
  onJustLoaded?: LoadedCallback<VideoTextureSource>
) {
  // There's no built-in loader for videos, so we fake one of our own.
  const loader = {
    loadAsync: (path: string) => {
      return Promise.resolve(createVideoTexture(path));
    }
  };

  return asyncLoadResources(paths, loader, onJustLoaded);
}

/**
 * Sets up the necessary model loader for loading our app 3D models.
 * @returns An object containing the loader and a cleanup function.
 */
export function getModelLoader() {
  // For the models we will be just fine with one single loading manager.
  const draco = new DRACOLoader();

  /** The path to the DRACO decoder libraries. @see https://github.com/google/draco */
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  draco.preload();

  // All our models are on GLTF format.
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);

  return {
    gltfLoader,
    cleanup: () => {
      // Used to free-up memory after loading all the models.
      // The DRACO Instance will no longer be usable.
      draco.dispose();
    }
  };
}
