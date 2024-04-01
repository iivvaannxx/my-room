import {
  InstancedBufferAttribute,
  type InstancedMesh,
  MeshBasicMaterial,
  type MeshBasicMaterialParameters,
  ShaderChunk
} from "three";

export type UVOffsetableBasicMaterial = {
  /** The material that supports UV offsets. */
  material: MeshBasicMaterial;

  /**
   * Sets the UV offsets for the material.
   *
   * @param mesh - The instanced mesh to set the UV offsets for.
   * @param offset - The UV offset values as an array of [u, v] pairs.
   */
  setUVOffsets(mesh: InstancedMesh, offset: [number, number][]): void;
};

/**
 * Creates a UV offsetable basic material ready to use with instanced meshes.
 * Instanced meshes require a custom attribute to be passed to the shader.
 * This method abstracts the process of modifying the shader to support instanced UV offsets.
 *
 * @remarks The UV offset attribute must be named `uvOffset`. Must be a `vec2` like object.
 * @remarks It only applies UV offsets to the `map` input of the material.
 *
 * @param params - The parameters for the material.
 * @returns An object containing the material and a method to set the UV offset.
 */
export function makeUVOffsetableBasicMaterial(
  params: MeshBasicMaterialParameters
): UVOffsetableBasicMaterial {
  const material = new MeshBasicMaterial(params);
  const mapChunk = ShaderChunk.map_fragment;

  material.onBeforeCompile = (shader) => {
    // We declare our custom atribute and the varying that will be passed to the fragment shader.
    shader.vertexShader = `
      attribute vec2 uvOffset;
      varying vec2 vUv;
      ${shader.vertexShader}
    `
      .trim()
      .replace(
        // biome-ignore format: The code it's more clear within 2 lines.
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvUv = uv + uvOffset;"
      );

    // We replace the part of the shader chunk that samples the map texture.
    // We use our custom UVs instead of the default ones.
    const offsetableMapChunk = mapChunk.replace(
      "texture2D( map, vMapUv )",
      "texture2D( map, vUv )"
    );

    // Replace the default map fragment with our custom one.
    shader.fragmentShader = `
      varying vec2 vUv;
      ${shader.fragmentShader}
    `
      .trim()
      .replace(
        // biome-ignore format: The code it's more clear within 2 lines.
        "#include <map_fragment>",
        offsetableMapChunk
      );
  };

  const patchedMaterial: UVOffsetableBasicMaterial = {
    material,

    /**
     * Sets the UV offsets for the material.
     * @param offset - The UV offset values as an array of [u, v] pairs.
     */
    setUVOffsets(mesh, offset) {
      const uvOffsets = offset.flat();
      const uvOffsetAttribute = new Float32Array(uvOffsets);
      const uvOffsetBuffer = new InstancedBufferAttribute(uvOffsetAttribute, 2);

      mesh.geometry.setAttribute("uvOffset", uvOffsetBuffer);
    }
  };

  return patchedMaterial;
}
