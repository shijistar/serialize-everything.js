export const baseObject = {
  name: 'John',
  age: 30,
  date: new Date(),
  regex: /abc/g,
  symbol: Symbol.for('test'),
  func: function () {
    return 'Hello';
  },
  add: function (a: number, b: number) {
    return a + b;
  },
  child: {
    name: 'Jane',
    age: 5,
    date: new Date(),
    regex: /xyz/g,
    func: function () {
      return 'Hi';
    },
    multiply: function (a: number, b: number) {
      return a * b;
    },
  },
};
