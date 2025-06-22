/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  StringifyOptions,
  ParseOptions,
  ExpandPrototypeChainOptions,
  InternalStringifyOptions,
  InternalParseOptions,
  Patch,
  PathType,
  SerializedResult,
  ValueRef,
} from './interface';
import { escapeRegExp, findPath, getByPath } from './utils';

/**
 * Notes:
 *
 * 1. Do not use 'closure' in the function, the function body can be serialized but the closure
 *    reference can't. If it's a class, set the closures to the class properties, and use 'this' to
 *    access them. If it's a normal function, set the closures to the function reference, and use
 *    the function name to access them.
 * 2. Do not use `function.bind`, because the bound function body is hidden. The `toString` method just
 *    returns `[native code]`.
 * 3. Do not use anonymous Symbols in both object keys and values. Use system predefined Symbols
 *    instead or use `Symbol.for` to create a Symbol. The anonymous Symbols can't be serialized and
 *    event cannot be created.
 * 4. No direct or indirect circular references are allowed.
 * 5. For classes, should avoid private properties and methods, because they are not accessible from
 *    outside and can't be serialized. Please use a normal property or method instead, and starts
 *    with `_` to indicate it's a private member. If you are using TypeScript, you can use the
 *    `private` keyword to declare as private, which looks a little better.
 * 6. Class constructors will be dropped.
 */

const TokenStart = '$SJS$';
const TokenEnd = '$SJE$';
const VariablePrefix = '$SJV$_';
const SymbolKeyRegExps: [RegExp, RegExp] = [
  /\[Symbol\.\w+\]/,
  /\[Symbol\.for\([\u0027\u0022].+?[\u0027\u0022]\)\]/,
];
const SymbolKeyPrefixRegExp = /\[/;
const SymbolKeySuffixRegExp = /\]/;

const predefinedSymbols = Object.keys(Object.getOwnPropertyDescriptors(Symbol))
  .map((key) => {
    if (typeof Symbol[key as keyof typeof Symbol] === 'symbol') {
      return Symbol[key as keyof typeof Symbol];
    }
    return undefined;
  })
  .filter(Boolean) as symbol[];

/**
 * Serialize JavaScript object to string, support functions. Should including all fields of both
 * object and prototype.
 *
 * @param {any} obj - The object to serialize.
 *
 * @returns The serialized string.
 */
export function stringify(obj: any, options?: StringifyOptions): string {
  return serializeJavascriptRecursively(obj, { ...options, patches: [], refs: [] });
}

function serializeJavascriptRecursively(obj: any, options: InternalStringifyOptions): string {
  const {
    tokenStart: TS = TokenStart,
    tokenEnd: TE = TokenEnd,
    variablePrefix: VP = VariablePrefix,
    parentPath,
    patches,
    refs,
    sourceOnly,
    debug,
  } = options ?? { patches: [], refs: [] };
  const fullObj = expandPrototypeChain(obj, { ...options, parentPath, patches });
  if (debug) {
    console.log('-------------- serializeJavascriptRecursively --------------', parentPath, obj);
  }
  const sourceStr = JSON.stringify(fullObj, (_key, value) => {
    if (value === null) {
      return `${TS}null${TE}`;
    } else if (value === undefined) {
      return undefined;
    } else if (value instanceof RegExp) {
      return `${TS}new RegExp('${value.source.replace(/\\\\/g, '\\')}', '${
        value.flags ?? ''
      }')${TE}`;
      // `value instanceof Date` will never work, try testing date format instead
    } else if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)
    ) {
      return `${TS}new Date('${value}')${TE}`;
    } else if (typeof value === 'bigint') {
      return `${TS}BigInt('${value.toString()}')${TE}`;
    } else if (typeof value === 'symbol') {
      if (Symbol.keyFor(value)) {
        return `${TS}Symbol.for('${Symbol.keyFor(value)}')${TE}`;
      }
      return `${TS}Symbol('${value.description}')${TE}`;
    } else if (value instanceof Error) {
      return `${TS}new Error('${value.message}')${TE}`;
    } else if (typeof value === 'object') {
      // Save the symbol keys to a string property, because symbol keys are not serializable.
      // They will be restored in the deserialization process.
      for (const symbol of Object.getOwnPropertySymbols(value)) {
        // only predefined symbols and keyed symbols are preserved
        const symbolKey = getSymbolFieldName(symbol);
        let symbolValue = value[symbol];
        if (!symbolKey || symbolValue == null) {
          continue;
        }
        if (
          symbolValue != null &&
          typeof symbolValue !== 'string' &&
          typeof symbolValue !== 'number' &&
          typeof symbolValue !== 'boolean'
        ) {
          const path = findPath(fullObj, value);
          const ref: ValueRef = {
            variable: `${VP}ref${refs.length + 1}`,
            code: '',
          };
          refs.push(ref);
          ref.code = serializeJavascriptRecursively(symbolValue, {
            ...options,
            parentPath: path,
            sourceOnly: true,
          });
          if (debug) {
            console.log(
              '-------------- serializeJavascriptRecursively(symbol) --------------',
              path,
              symbol,
              symbolValue,
              ref
            );
          }
          symbolValue = `${TS}${ref.variable}${TE}`;
        }
        value[symbolKey] = symbolValue;
      }
      return value;
    } else if (typeof value === 'function') {
      let funcStr: string = value.toString();
      if (funcStr.includes('{ [native code] }')) {
        return undefined;
      }
      if (
        !funcStr.startsWith('function') &&
        !funcStr.startsWith('async function') &&
        !funcStr.startsWith('class') &&
        !funcStr.startsWith('function*') &&
        !funcStr.startsWith('async function*') &&
        !funcStr.replace(/\s/g, '').match(/^\(?[^)]+\)?=>/)
      ) {
        // If it's a computed property function, for example: { [Symbol.toPrimitive]() { return 1; } }
        // the funcStr is like: `[Symbol.toPrimitive]() { return 1; }`, so we can safely remove it.
        funcStr = funcStr.replace(/^\[[^\]]+\]/, '');
        funcStr = `function ${funcStr}`;
      }
      funcStr = funcStr.replace(/"/g, "'");
      return `${TS}(${funcStr})${TE}`;
    }
    return value;
  });

  let prevPatches: Patch[] = [];
  while (prevPatches.length !== patches.length) {
    prevPatches = [...patches];
    patches.forEach((patch) => {
      if (!patch.ref) {
        const ref: ValueRef = {
          variable: `${VP}ref${refs.length + 1}`,
          code: '',
        };
        refs.push(ref);
        patch.ref = `${TS}${ref.variable}${TE}`;
        if (debug) {
          console.log(
            '-------------- serializeJavascriptRecursively(patch) --------------',
            patch.path,
            patch.context
          );
        }
        ref.code = serializeJavascriptRecursively(patch.context, {
          ...options,
          parentPath: patch.path,
          sourceOnly: true,
        });
        delete patch.context;
      }
    });
  }

  const result: SerializedResult = {
    source: sourceStr,
    patches: sourceOnly ? [] : patches,
    refs: sourceOnly ? [] : refs,
  };
  if (debug && !sourceOnly) {
    console.log('-------------- serializeJavascript(final) --------------', JSON.stringify(result));
  }
  return JSON.stringify(result);
}

/**
 * Deserialize JavaScript object from string, support functions. Should including all fields of both
 * object and prototype.
 *
 * @param {string} input - The string to deserialize.
 * @param {object} options - The options to deserialize.
 * @param {function} [options.closure] - The closure to use when deserializing the object.
 *
 * @returns The deserialized object.
 */
export function parse(input: string, options?: ParseOptions) {
  const { variablePrefix = VariablePrefix, closure } = options ?? {};
  if (!input) {
    return undefined;
  }
  const inputObj = JSON.parse(input) as SerializedResult;
  const reversedRefs = inputObj.refs.reverse();
  const refMap: Record<string, unknown> = {};
  reversedRefs.forEach((ref) => {
    const { variable, code } = ref;
    const refData = JSON.parse(code) as SerializedResult;
    const refValue = executeDeserialize(refData, {
      ...options,
      closure: { ...refMap, ...closure },
      variablePrefix,
      enablePatches: false,
    });
    refMap[variable] = refValue;
  });
  try {
    return executeDeserialize(inputObj, {
      ...options,
      closure: { ...closure, ...refMap },
      variablePrefix,
      enablePatches: true,
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function executeDeserialize(result: SerializedResult, options: InternalParseOptions) {
  const { variablePrefix: VP, closure, get = getByPath, debug, prettyPrint = true } = options ?? {};
  const code = getDeserializeJavascriptCode(result, options);
  if (debug) {
    const printSourceCode = getDeserializeJavascriptCode(result, { ...options, isPrint: true });
    const prettyPrintCode = `\`${printSourceCode.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
    const realCode = `'${printSourceCode.replace(/\n/g, '\\n').replace(/'/g, "\\'")}'`;
    const printCode = prettyPrint ? prettyPrintCode : realCode;
    console.log(
      '-------------- deserializeCode --------------\n',
      `${getByPath.toString()}
    new Function('${VP}context', '${VP}options', ${printCode})(${
        closure ? 'closure' : 'undefined'
      }, { get: getByPath });`,
      'closure =',
      closure
    );
  }
  try {
    const deserializeResult = new Function(`${VP}context`, `${VP}options`, code)(closure, {
      get,
    });
    return deserializeResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function getDeserializeJavascriptCode(result: SerializedResult, options: InternalParseOptions) {
  const {
    tokenStart = TokenStart,
    tokenEnd = TokenEnd,
    variablePrefix: VP,
    closure,
    enablePatches = true,
    isPrint,
  } = options ?? {};
  const { source: sourceCode, patches } = result;
  // console.log('deserializeJavascript', str, sourceCode);
  const escapeSingleQuote = (str: string) => str.replace(/'/g, isPrint ? "\\\\'" : "\\'");
  const content = `${
    closure ? `const { ${Object.keys(closure ?? {}).join(', ')} } = ${VP}context || {};` : ''
  }
const { get } = ${VP}options;
const deserializeResult = (\n${decodeFormat(sourceCode, { tokenStart, tokenEnd })}\n);
const patches = ${
    enablePatches
      ? decodeFormat(
          JSON.stringify(
            patches.map(({ path, ref }) => {
              // replace the context with ref
              return {
                path,
                context: ref,
              };
            })
          ),
          { tokenStart, tokenEnd }
        )
      : '[]'
  };

const restoreSymbolKeys = (obj, paths=[]) => {
  if (obj && !paths.includes(obj)) {
    if (typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        if (key.match(new RegExp('^${escapeRegExp(SymbolKeyRegExps[0], {
          escapeTwice: isPrint,
          format: escapeSingleQuote,
        })}$')) || key.match(new RegExp('^${escapeRegExp(SymbolKeyRegExps[1], {
    escapeTwice: isPrint,
    format: escapeSingleQuote,
  })}$'))) {
          obj[new Function('return ' + key.replace(new RegExp('^${escapeRegExp(
            SymbolKeyPrefixRegExp,
            { escapeTwice: isPrint }
          )}'), '').replace(new RegExp('${escapeRegExp(SymbolKeySuffixRegExp, {
    escapeTwice: isPrint,
  })}$'), ''))()] = obj[key];
          delete obj[key];
        }
      });
      for (const key of [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)]) {
        if (typeof obj[key] === 'object') {
          restoreSymbolKeys(obj[key], [obj]);
        }
      }
    }
  }
}
restoreSymbolKeys(deserializeResult);

patches.forEach(({ path, context }) => {
  const sourceObj = path?.length ? get(deserializeResult, path) : deserializeResult;
  if (sourceObj) {
    Object.assign(sourceObj, context);
  }
});
return deserializeResult;`;
  return content;
}

/**
 * Expands the prototype chain of the source object, including all properties from the prototype
 * chain.
 *
 * @param source - The source object to expand.
 * @param options - Options to control the expansion behavior.
 */
export function expandPrototypeChain(
  source: any,
  options?: ExpandPrototypeChainOptions
): typeof source {
  const { parentPath, patches = [] } = options ?? {};
  return expandPrototypeChainRecursively(source, {
    ...options,
    patches,
    paths: parentPath,
    parents: [],
  });
}

function expandPrototypeChainRecursively(
  source: any,
  options: {
    patches: Patch[];
    paths?: PathType[];
    parents?: any[];
  } & Pick<StringifyOptions, 'preserveClassConstructor'>
): typeof source {
  const { patches, paths = [], parents = [] } = options ?? {};
  // console.log('getFullObjectWithPrototype', obj, Object.prototype.toString.call(obj));
  if (source == null || source === Array.prototype || source === Object.prototype) {
    return source;
  }
  const typeName = Object.prototype.toString.call(source);
  let result: any = source;
  if (
    Array.isArray(source) ||
    (typeof source === 'object' &&
      typeName !== '[object Date]' &&
      typeName !== '[object RegExp]' &&
      typeName !== '[object Error]' &&
      typeName !== '[object Symbol]')
  ) {
    if (parents.includes(source)) {
      return undefined;
    }
    let newSource: any = Array.isArray(source) ? [] : {};
    result = Array.isArray(source) ? [] : {};
    if (source instanceof Map) {
      newSource = {};
      source.forEach((value, key) => {
        newSource[key] = value;
      });
    } else if (source instanceof Set) {
      newSource = Array.from(source);
    }

    // Expand prototype properties to newSource
    const proto = pickPrototype(source, options);
    getFullKeys(proto).forEach((key) => {
      newSource[key] = proto[key];
    });
    // copy own properties to newSource
    getFullKeys(source).forEach((key) => {
      newSource[key] = source[key];
    });
    for (const key of getFullKeys(newSource)) {
      result[key] = expandPrototypeChainRecursively(newSource[key], {
        ...options,
        patches,
        paths: [...paths, typeof key === 'string' && key.match(/^\d+$/) ? Number(key) : key],
        parents: [...parents, source],
      });
    }
  }

  // Copy extra context, only for function and array, which can't hold custom properties in JSON format
  if (Array.isArray(result) || typeof result === 'function') {
    let skipKeys: string[] = [];
    if (typeof result === 'function') {
      skipKeys = ['length', 'name', 'arguments', 'caller', 'prototype'];
    } else if (Array.isArray(result)) {
      skipKeys = ['length'];
    }
    const contextKeys = getFullKeys(result).filter((key) => !skipKeys.includes(key as string));
    if (contextKeys.length > 0) {
      const context: Record<string | symbol, unknown> = {};
      let hasExtra = false;
      contextKeys.forEach((key) => {
        // should not copy the constructor, because it's always Function and not a regular property
        if (key === 'constructor') return;
        if (typeof key === 'symbol' || !key.match(/^\d+$/)) {
          hasExtra = true;
          context[key] = result[key];
        }
      });
      if (hasExtra) {
        patches.push({
          path: paths,
          context,
        });
      }
    }
  }
  return result;
}

function decodeFormat(
  s: string | undefined,
  options: Pick<StringifyOptions, 'tokenStart' | 'tokenEnd'> = {}
): string | undefined {
  const { tokenStart = '', tokenEnd = '' } = options ?? {};
  const escapedTS = escapeRegExp(tokenStart);
  const escapedTE = escapeRegExp(tokenEnd);
  // return s
  //   ?.replace(/\\?['"]\$\(SJS\)\$/g, '')
  //   .replace(/\$\(SJE\)\$\\?['"]/g, '')
  //   .replace(/\\n/g, '\n');
  return s
    ?.replace(new RegExp(`\\\\?['"]${escapedTS}`, 'g'), '')
    .replace(new RegExp(`${escapedTE}\\\\?['"]`, 'g'), '')
    .replace(/\\n/g, '\n');
}

function getFullKeys(obj: any): (string | symbol)[] {
  return [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)].filter(
    (key) => {
      const descriptor = Object.getOwnPropertyDescriptor(obj, key);
      return descriptor && ('value' in descriptor || descriptor.get);
    }
  );
}

function getSymbolFieldName(symbol: symbol): string | undefined {
  if (predefinedSymbols.includes(symbol)) {
    return `[${symbol.description}]`;
  } else if (Symbol.keyFor(symbol)) {
    return `[Symbol.for('${Symbol.keyFor(symbol)}')]`;
  }
  return undefined;
}

/**
 * Picks all prototype properties from the source object, including those from its prototype chain.
 *
 * @param source - The source object to pick properties from.
 * @param options - Options to control the behavior of the picking.
 */
export function pickPrototype(
  source: any,
  options?: Pick<StringifyOptions, 'preserveClassConstructor'>
): Record<string | symbol, any> {
  const { preserveClassConstructor } = options ?? {};
  const target: Record<string | symbol, any> = Object.create(null);
  const ignoredKeys = [preserveClassConstructor ? undefined : 'constructor'].filter(Boolean) as (
    | string
    | symbol
  )[];
  let proto = Object.getPrototypeOf(source);
  while (proto != null && proto !== Object.prototype && proto !== Array.prototype) {
    const protoKeys = getFullKeys(proto);
    for (const key of protoKeys) {
      if (!(key in target) && !ignoredKeys.includes(key)) {
        try {
          // should use source[key] instead of proto[key], because the member may be a getter which
          // relies on some other members of source object
          target[key] = source[key];
        } catch (error) {
          // console.error(error);
        }
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return target;
}
