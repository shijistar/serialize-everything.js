import type { PathType } from '../interface';

/**
 * Escapes special characters in a string for use in a regular expression.
 *
 * @param regExp - The string to escape
 *
 * @returns The escaped string that can be safely used in a RegExp constructor
 */
export function escapeRegExp(
  regExp: string | RegExp,
  options?: { escapeTwice?: boolean; format?: (result: string) => string }
): string {
  const { escapeTwice = false, format } = options ?? {};
  const content = typeof regExp === 'string' ? regExp : regExp.source;
  // $& Indicates the entire matched string
  const result = content.replace(/[.*+?^${}()|[\]\\]/g, escapeTwice ? '\\\\$&' : '\\$&');
  return format ? format(result) : result;
}

export function findPath(parent: any, target: any, path: PathType[] = []): PathType[] | undefined {
  if (parent === target) {
    return path;
  }
  if (typeof parent !== 'object' || parent === null) {
    return undefined;
  }
  for (const key of [...Object.keys(parent), ...Object.getOwnPropertySymbols(parent)]) {
    const result = findPath(parent[key], target, [...path, key]);
    if (result) {
      return result;
    }
  }
  return undefined;
}

/**
 * Gets the value at path of object. If the resolved value is undefined, the defaultValue is
 * returned in its place.
 *
 * @param obj - The object to query
 * @param path - The path of the property to get (accepts strings, numbers, and symbols)
 * @param defaultValue - The value returned for undefined resolved values
 *
 * @returns The resolved value
 */
export function getByPath(obj: any, path: (string | number | symbol)[], defaultValue?: any): any {
  // Handle null/undefined objects
  if (obj == null) {
    return defaultValue;
  }

  // Handle empty path
  if (!path || path.length === 0) {
    return obj;
  }

  let current = obj;
  for (const key of path) {
    if (current == null) {
      return defaultValue;
    }
    current = current[key];
  }
  return current === undefined ? defaultValue : current;
}
