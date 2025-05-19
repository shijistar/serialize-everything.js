# deep-serialize

A JSON enhancement library that supports deep serialization of arbitrary JavaScript objects, including values like Function, Date, RegExp, and even Symbol

## Installation

Install using npm:

```bash
npm install deep-serialize
```

Install using pnpm:

```bash
pnpm add deep-serialize
```

Install using bun:

```bash
bun add deep-serialize
```

Or using yarn:

```bash
yarn add deep-serialize
```

## Usage

```javascript
import { serialize, deserialize } from 'deep-serialize';

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

const serializedString = serialize(obj);
console.log(serializedString);

const deserializedResult = deserialize(serializedString);
console.log(deserializedResult);
```
