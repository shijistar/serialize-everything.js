# serialize-everything.js

**ATTENTION: THIS PROJECT HAS BEEN RENAMED TO [jsoneo](https://github.com/shijistar/jsoneo). PLEASE VISIT THE NEW REPOSITORY FOR THE LATEST UPDATES AND INFORMATION.**

`serialize-everything.js` is a lightweight JavaScript serialization library designed to provide comprehensive serialization and deserialization capabilities. It can handle nearly all JavaScript data types, including `primitives`, `Dates`, `RegExp`, `Symbols`, `Functions`, and `Classes`.

The core goal is to ensure that the dynamic characteristics of data are preserved during serialization and deserialization, allowing Functions and Classes to remain `executable` after reconstruction. A particularly valuable use case is the ability to share test cases between `Jest` unit tests and `Playwright` end-to-end tests. For libraries that support both browser and Node.js environments, this library provides a unified solution, eliminating the need to write separate test code for different environments.

## Key Features

- **Complete Serialization**: Handle primitives, complex objects, Dates, Symbols, RegExp, and more
- **Code Preservation**: Functions and classes remain fully executable after deserialization
- **Cross-Environment Compatible**: Seamlessly works in browsers, Node.js, and various JavaScript runtimes
- **Testing Powerhouse**: Reuse test cases between unit tests (Jest) and end-to-end tests (Playwright)
- **Lightweight**: Zero dependencies, ensuring fast performance and small bundle size

## Installation

Install using npm:

```bash
npm install serialize-everything.js
```

Install using pnpm:

```bash
pnpm add serialize-everything.js
```

Install using bun:

```bash
bun add serialize-everything.js
```

Or using yarn:

```bash
yarn add serialize-everything.js
```

## Usage

```javascript
import { stringify, parse } from 'serialize-everything.js';

const obj = {
  name: 'John',
  age: 30,
  date: new Date(),
  regex: /abc/g,
  func: function () {
    return 'Hello';
  },
  child: {
    name: 'Jane',
    age: 5,
    date: new Date(),
    regex: /xyz/g,
    func: function () {
      return 'Hi';
    },
  },
};

const content = stringify(obj);
console.log(content);

const obj = parse(content);
console.log(obj);
```
