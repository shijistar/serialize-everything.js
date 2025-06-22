import { parse, stringify } from '../src';
import { baseObject } from './data/obj';

describe('Core feature', () => {
  test('should be able to serialize objects', () => {
    const obj = baseObject;
    const serialized = stringify(obj);
    expect(typeof serialized).toBe('string');
  });

  test('should be able to parse serialized objects', () => {
    const obj = baseObject;
    const serialized = stringify(obj);
    const parsed = parse(serialized) as typeof obj;
    expect(parsed.name).toBe(obj.name);
    expect(parsed.age).toBe(obj.age);
    expect(parsed.date).toEqual(obj.date);
    expect(parsed.regex).toEqual(obj.regex);
    expect(parsed.symbol).toEqual(obj.symbol);
    expect(parsed.func).toBeDefined();
    expect(parsed.func()).toBe('Hello');
    expect(parsed.add).toBeDefined();
    expect(parsed.add(1, 2)).toBe(3);
    expect(parsed.child.name).toBe(obj.child.name);
    expect(parsed.child.age).toBe(obj.child.age);
    expect(parsed.child.date).toEqual(obj.child.date);
    expect(parsed.child.regex).toEqual(obj.child.regex);
    expect(parsed.child.func).toBeDefined();
    expect(parsed.child.func()).toBe('Hi');
    expect(parsed.child.multiply).toBeDefined();
    expect(parsed.child.multiply(2, 3)).toBe(6);
  });
});
