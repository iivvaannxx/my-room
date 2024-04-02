/** Extracts the file name from a given string that represents a file. */
export type FileName<T extends string> = T extends `${infer Name}.${string}`
  ? Name
  : never;

/**
 * Removes the file extension from a given path.
 *
 * @param path - The path to remove the extension from.
 * @returns The path without the file extension.
 */
export function removeExtension<T extends `${string}.${string}`>(path: T) {
  return path.replace(/\.[^.]+$/, "") as FileName<T>;
}

/**
 * Finds and returns the first element that matches the specified selector within the given context.
 * If no context is provided, the search will be performed within the entire document.
 *
 * @param selector - The CSS selector to match the element.
 * @param context - The document or element within which to perform the search. Defaults to the document.
 * @returns The first element that matches the selector, or null if no match is found.
 */
export function $(selector: string, context: Document | HTMLElement = document) {
  return context.querySelector(selector);
}

/**
 * Iterates over the own enumerable properties of an object and invokes the provided callback function for each property.
 * If the property value is an object and `recursive` is `true`, it will recursively iterate over its own enumerable properties as well.
 *
 * @template T The type of the object.
 * @param obj The object to iterate over.
 * @param callback The callback function to invoke for each property.
 * @param recursive Specifies whether to recursively iterate over the properties of nested objects.
 * @param maxDepth The maximum depth of recursion when iterating over nested objects.
 */
export function forEachOwn<T extends Record<string, unknown>>(
  obj: T,
  callback: (key: keyof T, value: T[keyof T]) => void,
  recursive = false,
  maxDepth = Number.POSITIVE_INFINITY
) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        recursive &&
        maxDepth > 0
      ) {
        forEachOwn(obj[key] as T, callback, recursive, maxDepth - 1);
      } else {
        callback(key, obj[key]);
      }
    }
  }
}

/**
 * Recursively iterates over the own enumerable properties of an object and invokes the provided callback function for each property.
 *
 * @template T - The type of the object.
 * @param obj - The object to iterate over.
 * @param callback - The callback function to invoke for each property. It receives the key and value of each property as arguments.
 */
export function forEachOwnRecursive<T extends Record<string, unknown>>(
  obj: T,
  callback: (key: keyof T, value: T[keyof T]) => void
) {
  // Just a shorthand for the unlimited recursive version.
  forEachOwn(obj, callback, true);
}

/**
 * Counts the number of keys in an object recursively.
 * @template T - The type of the object.
 *
 * @param obj - The object to count the keys of.
 * @returns The number of keys in the object.
 */
export function countObjectKeysRecursive<T extends Record<string, unknown>>(
  obj: T
): number {
  let count = 0;
  forEachOwnRecursive(obj, () => {
    count++;
  });

  return count;
}
