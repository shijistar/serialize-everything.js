export type PathType = string | number | symbol;
export interface Patch {
  path: PathType[];
  context: any;
  ref?: string;
}
export interface ValueRef {
  variable: string;
  code: string;
}
export interface SerializedResult {
  source: string;
  patches: Patch[];
  refs: ValueRef[];
}

export interface StringifyOptions {
  /** The start token to mark the start of the serialized string. Default is `$<SJS>$`. */
  tokenStart?: string;
  /** The end token to mark the end of the serialized string. Default is `$<SJE>$`. */
  tokenEnd?: string;
  /** The prefix of the variable name to be used in the serialized string. Default is `$SJV$_`. */
  variablePrefix?: string;
  /** Whether to preserve the code of class constructor during serialization. Default is `false`. */
  preserveClassConstructor?: boolean;
  /** Whether to print debug information during serialization. Default is `false`. */
  debug?: boolean;
}

export type InternalStringifyOptions = StringifyOptions & {
  /**
   * Whether to serialize the source of the object only, and ignore the `patches` and `refs`.
   * Default is `false`.
   */
  sourceOnly?: boolean;
  parentPath?: PathType[];
  patches: Patch[];
  refs: ValueRef[];
};

export type ParseOptions = Pick<
  StringifyOptions,
  'tokenStart' | 'tokenEnd' | 'variablePrefix' | 'debug'
> & {
  /**
   * The function to get a child value from source object. It's used to restore the patched values.
   *
   * Strongly recommended to use `lodash.get` method
   */
  get?: GetFunc;
  /**
   * The global closure variables for deserialization. If the deserialization code contains
   * functions which use some global variables or modules, it's a good idea to pass them here.
   */
  closure?: Record<string, unknown>;
  /**
   * Whether to pretty print the deserialized object. Default is `true`.
   *
   * - `true`: Pretty print the deserialized code with indentation and new lines, which is more
   *   readable, but may be a little different from the real execution code.
   * - `false` - Print the object in a single line, which is more compact and similar to the real
   *   execution code.
   */
  prettyPrint?: boolean;
};

export interface InternalParseOptions extends ParseOptions {
  enablePatches?: boolean;
  isPrint?: boolean;
}

export type ExpandPrototypeChainOptions = {
  /** The parent path of the object */
  parentPath?: PathType[];
  /** The output patches to apply to the object after expanding the prototype chain. */
  patches?: Patch[];
} & Pick<StringifyOptions, 'preserveClassConstructor'>;

/**
 * The function to get a child value from source object
 *
 * @param {any} obj - The object to get the value from.
 * @param {(string | number | symbol)[]} path - The path to the value.
 *
 * @returns {any} The value.
 */
export type GetFunc = (
  /** The object to get the value from */
  obj: any,
  /** The path to the value */
  path: (string | number | symbol)[]
) => any;
