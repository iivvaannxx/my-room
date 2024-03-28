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
