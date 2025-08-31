# serialize-everything.js

**ATTENTION: 此项目已经迁移到 [jsoneo](https://github.com/shijistar/jsoneo)， 请访问新仓库以获取最新更新和信息。**

`serialize-everything.js` 是一个轻量级的 JavaScript 序列化库，旨在提供全面的序列化和反序列化功能。它能够处理几乎所有 JavaScript 数据类型，包括 `原始类型`、`日期`、`正则表达式`、`符号`、`函数` 和 `类` 等。

核心目标是确保在序列化和反序列化过程中，数据的动态特性得以保留，使得 `函数` 和 `类` 在重建后仍然可执行。一个特别有价值的使用场景是，可以让 `Jest` 单元测试和 `Playwright` 端到端测试之间共享一套测试用例。对于哪些同时支持浏览器和 Node.js 环境的类库，这个库提供了一个统一的解决方案，你不需要为不同的环境编写两套测试代码。

## 特性

- **全面序列化**: 处理原始类型、复杂对象、日期、符号、正则表达式等
- **代码保留**: 函数和类在反序列化后仍然可执行
- **跨环境兼容**: 在浏览器、Node.js 和各种 JavaScript 运行时中无缝工作
- **测试强大**: 在单元测试（Jest）和端到端测试（Playwright）之间重用测试用例
- **轻量级**: 零依赖，确保快速性能和小的包大小

## 安装

使用 npm 安装:

```bash
npm install serialize-everything.js
```

使用 pnpm 安装:

```bash
pnpm add serialize-everything.js
```

使用 bun 安装:

```bash
bun add serialize-everything.js
```

或者使用 yarn:

```bash
yarn add serialize-everything.js
```

## 用法

```javascript
import { parse, stringify } from 'serialize-everything.js';

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
