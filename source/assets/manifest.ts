import { type FileName, removeExtension } from "@app/utils/misc";
import type { Texture } from "three";

/** The maps we baked for each model. */
export const BAKE_MAPS = ["ao.webp", "color.webp", "lightmap.webp"] as const;

type BakeMap = (typeof BAKE_MAPS)[number];
type BakeMapRecord<T = string> = Record<FileName<BakeMap>, T>;

// A type that defines the baked maps for a model.
export type ModelBakedMaps = BakeMapRecord<Texture>;

/** The resolutions available for our maps. */
export const BAKE_RESOLUTIONS = {
  // low: "1K",
  // medium: "2K",
  high: "4K"
  // ultra: "8K"
} as const;
type BakeResolutions = typeof BAKE_RESOLUTIONS;

// The base URLs for our assets.
const MODELS_BASE_URL = "/models";
const MEDIA_BASE_URL = "/media";
const TEXTURES_BASE_URL = "/textures";

// Helper to retrieve the url of a media asset.
function media(name: string) {
  return `${MEDIA_BASE_URL}/${name}`;
}

// Helper to retrieve the url of a model asset.
function model(name: string) {
  return `${MODELS_BASE_URL}/${name}`;
}

// Helper to retrieve the url of a texture asset.
function texture(name: string) {
  return `${TEXTURES_BASE_URL}/${name}`;
}

/**
 * Retrieves the URLs of baked maps for a given name.
 *
 * @param name - The name of the map.
 * @returns An array of URLs for the baked maps.
 */
function bakedMap<TName extends string>(name: TName, resolutions = BAKE_RESOLUTIONS) {
  const result = {} as Record<keyof BakeResolutions, Record<FileName<BakeMap>, string>>;

  for (const [resName, res] of Object.entries(resolutions)) {
    const resKey = resName as keyof BakeResolutions;
    result[resKey] = {} as BakeMapRecord;

    for (const map of BAKE_MAPS) {
      const mapName = removeExtension(map);
      result[resKey][mapName] = texture(`bakes/${res}/${name}/${map}`);
    }
  }

  return result;
}

/** All the assets we use in the application. */
export const assetsManifest = {
  media: {
    videos: {
      battery: media("videos/battery.mp4"),
      inspiration: media("videos/inspiration.mp4"),
      coding: media("videos/coding.mp4")
    }
  },

  models: {
    bed: model("bed.glb"),
    chair: model("chair.glb"),
    furniture: model("furniture.glb"),

    room: model("room.glb"),
    tech: model("tech.glb"),
    props1: model("props1.glb"),
    props2: model("props2.glb")
  },

  textures: {
    bakes: {
      // All our exported models with their respective map paths.
      bed: bakedMap("bed"),
      chair: bakedMap("chair"),
      furniture: bakedMap("furniture"),

      room: bakedMap("room"),
      tech: bakedMap("tech"),
      props1: bakedMap("props1"),
      props2: bakedMap("props2")
    },

    misc: {
      clock: {
        colon: texture("clock/colon.webp"),
        digits: {
          0: texture("clock/digit0.webp"),
          1: texture("clock/digit1.webp"),
          2: texture("clock/digit2.webp"),
          3: texture("clock/digit3.webp"),
          4: texture("clock/digit4.webp"),
          5: texture("clock/digit5.webp"),
          6: texture("clock/digit6.webp"),
          7: texture("clock/digit7.webp"),
          8: texture("clock/digit8.webp"),
          9: texture("clock/digit9.webp")
        }
      },

      dana: texture("dana.webp")
    }
  }
} as const;

export type RecursiveRecord<T> = {
  [key: PropertyKey]: RecursiveRecord<T> | T;
};
