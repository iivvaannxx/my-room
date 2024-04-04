import { countObjectKeysRecursive } from "@app/utils/misc";

/**
 * Represents a type that recursively transforms all string values in an object to the type `string`.
 * @template T - The type of the object.
 */
export type NestedPaths<T> = {
  [P in keyof T]: T[P] extends string ? string : NestedPaths<T[P]>;
};

/**
 * Represents a type that maps each property of the input type `T` to either `TAsset` or a nested `LoadedAssets` type.
 * @template T - The input type.
 * @template TAsset - The type of the asset.
 */
export type LoadedAssets<T, TAsset> = {
  [P in keyof T]: T[P] extends string ? TAsset : LoadedAssets<T[P], TAsset>;
};

/**
 * Represents a callback function that is called when an asset is loaded.
 * @template TAsset - The type of the asset.
 */
export type LoadedCallback<TAsset> = (data: {
  path: string;
  count: number;
  total: number;
  asset: TAsset;
}) => void;

/** Represents an asynchronous loader for data of type TData. */
interface IAsyncLoader<TData> {
  /**
   * Loads data asynchronously from the specified path.
   * @param path The path to load the data from.
   * @returns A promise that resolves to the loaded data.
   */
  loadAsync(path: string): Promise<TData>;
}

/**
 * Asynchronously loads resources from the specified paths using the provided loader.
 *
 * @template TPaths The type of the paths object.
 * @template TAsset The type of the loaded asset.
 *
 * @param paths An object containing the paths of the resources to load.
 * @param loader The loader function used to load the resources.
 * @param onJustLoaded Optional callback function called when a resource is loaded.
 * @returns A promise that resolves to an object containing the loaded resources.
 */

async function recursiveLoadPaths<TPaths extends NestedPaths<TPaths>, TAsset>(
  paths: TPaths,
  loader: IAsyncLoader<TAsset>,
  status: { count: number; total: number },
  onJustLoaded?: LoadedCallback<TAsset>
): Promise<LoadedAssets<TPaths, TAsset>> {
  // This is a bit of a scary function, but it's the core of the loading process.
  // It takes a simple object, this object may contain either strings (paths), or nested objects with more paths.
  // The object can be nested to any depth, and we will load all the paths in it.
  // We keep track of the total number of paths to load, and the number of paths we have loaded so far.
  // We also have an optional callback that will be called every time a path is loaded.

  // TypeScript will infer the type of the asset loaded via the given loader.
  // All the paths of the object should point to the same type of asset.

  // We will resolve our own promise when everything is loaded.
  return new Promise((resolve, reject) => {
    const promises = Object.keys(paths).map(async (key) => {
      // Let TypeScript know that the key can be used to index the paths object.
      const typedKey = key as keyof TPaths;
      const value = paths[typedKey];

      if (typeof value === "string") {
        // It's a path to an asset, load it.
        const asset = (await loader.loadAsync(value).catch(reject)) as TAsset;
        onJustLoaded?.({
          path: value,
          count: ++status.count,
          total: status.total,
          asset
        });

        return [typedKey, asset];
      }

      // It's a nested object, load it recursively.
      const nestedResult = await recursiveLoadPaths(
        // biome-ignore lint/suspicious/noExplicitAny: We can't know the type of the nested paths.
        value as NestedPaths<any>,
        loader,
        status,
        onJustLoaded
      );

      return [typedKey, nestedResult];
    });

    Promise.all(promises)
      .then((assets) => {
        resolve(Object.fromEntries(assets) as LoadedAssets<TPaths, TAsset>);
      })
      .catch(reject);
  });
}

/**
 * Asynchronously loads resources from the specified paths using the provided loader.
 *
 * @template TPaths The type of the paths object.
 * @template TAsset The type of the loaded asset.
 *
 * @param paths An object containing the paths of the resources to load.
 * @param loader The loader function used to load the resources.
 * @param onJustLoaded Optional callback function called when a resource is loaded.
 * @returns A promise that resolves to an object containing the loaded resources.
 */

export async function asyncLoadResources<TPaths extends NestedPaths<TPaths>, TAsset>(
  paths: TPaths,
  loader: IAsyncLoader<TAsset>,
  onJustLoaded?: LoadedCallback<TAsset>
): Promise<LoadedAssets<TPaths, TAsset>> {
  const totalPaths = countObjectKeysRecursive(paths);
  const currentStatus = { count: 0, total: totalPaths };

  return recursiveLoadPaths(paths, loader, currentStatus, onJustLoaded);
}
