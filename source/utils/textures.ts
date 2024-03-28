import { SRGBColorSpace, type Texture, VideoTexture } from "three";

/**
 * Calculates the maximum texture resolution the running device can handle.
 * @returns The maximum size (in pixels) supported by the device.
 */
export function getHighestSupportedTextureSize() {
  const offCanvas = document.createElement("canvas");
  const gl = offCanvas.getContext("webgl2") ?? offCanvas.getContext("webgl");

  if (!gl) {
    throw new Error("Your browser doesn't support WebGL");
  }

  return gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
}

/**
 * Preprocesses a texture for GLTF usage. Our baked models use UV1 for baked maps.
 * This function defaults the texture to use UV1, it can be changed by passing a different UV channel.
 *
 * @param texture - The texture to preprocess.
 * @param uvChannel - The UV channel to use for the texture.
 * @returns The preprocessed texture.
 */
export function preprocessTextureForGLTF(texture: Texture, uvChannel = 1) {
  // We have our own mipmaps.
  texture.generateMipmaps = false;

  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.channel = uvChannel;

  return texture;
}

/** Represents the source of a video texture. */
export type VideoTextureSource = {
  texture: VideoTexture;
  source: HTMLVideoElement;
};

/**
 * Creates a video texture from the given source.
 *
 * @param path - The URL or path of the video source.
 * @param autoplay - Indicates whether the video should start playing automatically. Default is true.
 * @param loop - Indicates whether the video should loop. Default is true.
 * @returns An array containing the setup texture and the video element as a tuple.
 */
export function createVideoTexture(
  path: string,
  autoplay = true,
  loop = true
): VideoTextureSource {
  const source = document.createElement("video");

  source.muted = source.autoplay = autoplay;
  source.loop = loop;
  source.src = path;

  const texture = new VideoTexture(source);
  return { texture, source };
}
