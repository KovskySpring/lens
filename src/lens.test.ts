import { assertEquals, assertStrictEquals } from "@std/assert";
import lens, { type LensLike } from "./lens.ts";

function cell<T>(
  initial: T,
): LensLike<T> & { value: T; reads: number; writes: number } {
  return {
    value: initial,
    reads: 0,
    writes: 0,
    get() {
      this.reads++;
      return this.value;
    },
    set(next: T | ((current: T) => T)) {
      this.writes++;
      this.value = typeof next === "function"
        ? (next as (current: T) => T)(this.value)
        : next;
    },
  };
}

type Person = { name: string; age: number; address: { city: string } };

const person = (): Person => ({
  name: "ada",
  age: 36,
  address: { city: "london" },
});

function nameLens(source: LensLike<Person>) {
  return lens<Person, string>({
    source,
    forward: (p) => p.name,
    backward: (p, name) => ({ ...p, name }),
  });
}

Deno.test("get() runs forward over the source value", () => {
  const source = cell(person());
  assertEquals(nameLens(source).get(), "ada");
});

Deno.test("get() re-reads the source every call", () => {
  const source = cell(person());
  const name = nameLens(source);
  assertEquals(name.get(), "ada");
  source.set({ ...source.get(), name: "grace" });
  assertEquals(name.get(), "grace");
});

Deno.test("set(value) writes back through backward", () => {
  const source = cell(person());
  nameLens(source).set("grace");
  assertEquals(source.get().name, "grace");
});

Deno.test("set(value) leaves the rest of the source untouched", () => {
  const source = cell(person());
  nameLens(source).set("grace");
  assertEquals(source.get().age, 36);
  assertEquals(source.get().address.city, "london");
});

Deno.test("set(reducer) receives the current derived value", () => {
  const source = cell(person());
  const seen: string[] = [];
  nameLens(source).set((current) => {
    seen.push(current);
    return current.toUpperCase();
  });
  assertEquals(seen, ["ada"]);
  assertEquals(source.get().name, "ADA");
});

Deno.test("set(reducer) sees writes made by an earlier set", () => {
  const source = cell(person());
  const name = nameLens(source);
  name.set("grace");
  name.set((current) => current + " hopper");
  assertEquals(source.get().name, "grace hopper");
});

Deno.test("the recipe is exposed on the lens", () => {
  const source = cell(person());
  const name = nameLens(source);
  assertStrictEquals(name.recipe.source, source);
  assertEquals(name.recipe.forward(person()), "ada");
});

Deno.test("a lens can itself be used as a source", () => {
  const source = cell(person());
  const address = lens<Person, { city: string }>({
    source,
    forward: (p) => p.address,
    backward: (p, address) => ({ ...p, address }),
  });
  const city = lens<{ city: string }, string>({
    source: address,
    forward: (a) => a.city,
    backward: (a, city) => ({ ...a, city }),
  });

  assertEquals(city.get(), "london");
  city.set("cambridge");
  assertEquals(source.get().address.city, "cambridge");
  assertEquals(source.get().name, "ada");
});

Deno.test("set() always treats a function argument as a reducer", () => {
  type Handlers = { onClick: () => string };
  const source = cell<Handlers>({ onClick: () => "old" });
  const onClick = lens<Handlers, () => string>({
    source,
    forward: (h) => h.onClick,
    backward: (h, onClick) => ({ ...h, onClick }),
  });

  const replacement = () => "new";
  (onClick.set as (v: unknown) => void)(replacement);

  assertEquals(source.get().onClick as unknown, "new");
});

Deno.test("set() is a no-op on the source object itself", () => {
  const source = cell(person());
  const before = source.get();
  nameLens(source).set("grace");
  assertEquals(before.name, "ada");
});

Deno.test("set() writes through a reducer rather than reading the source", () => {
  const source = cell(person());
  const name = nameLens(source);

  source.reads = 0;
  name.set("grace");
  assertEquals(source.reads, 0);

  source.reads = 0;
  name.set((current) => current + " hopper");
  assertEquals(source.reads, 0);
});

type Nested = { a: { b: { c: string } } };

/**
 * Builds `source -> a -> b -> c` and counts how often each level derives.
 */
function chain(source: LensLike<Nested>) {
  const forwards = { a: 0, b: 0, c: 0 };

  const a = lens<Nested, Nested["a"]>({
    source,
    forward: (root) => {
      forwards.a++;
      return root.a;
    },
    backward: (root, next) => ({ ...root, a: next }),
  });

  const b = lens<Nested["a"], Nested["a"]["b"]>({
    source: a,
    forward: (state) => {
      forwards.b++;
      return state.b;
    },
    backward: (state, next) => ({ ...state, b: next }),
  });

  const c = lens<Nested["a"]["b"], string>({
    source: b,
    forward: (state) => {
      forwards.c++;
      return state.c;
    },
    backward: (state, next) => ({ ...state, c: next }),
  });

  return { c, forwards };
}

Deno.test("set(value) derives each level below it exactly once", () => {
  const source = cell<Nested>({ a: { b: { c: "x" } } });
  const { c, forwards } = chain(source);

  source.reads = 0;
  source.writes = 0;
  c.set("y");

  // The target level never derives: backward() already has the new value.
  assertEquals(forwards, { a: 1, b: 1, c: 0 });
  assertEquals(source.reads, 0);
  assertEquals(source.writes, 1);
  assertEquals(source.value.a.b.c, "y");
});

Deno.test("set(reducer) derives each level exactly once", () => {
  const source = cell<Nested>({ a: { b: { c: "x" } } });
  const { c, forwards } = chain(source);

  source.reads = 0;
  source.writes = 0;
  c.set((current) => current + "y");

  // The target level derives once, to hand the reducer its current value.
  assertEquals(forwards, { a: 1, b: 1, c: 1 });
  assertEquals(source.reads, 0);
  assertEquals(source.writes, 1);
  assertEquals(source.value.a.b.c, "xy");
});

Deno.test("get() derives each level exactly once", () => {
  const source = cell<Nested>({ a: { b: { c: "x" } } });
  const { c, forwards } = chain(source);

  source.reads = 0;
  assertEquals(c.get(), "x");
  assertEquals(forwards, { a: 1, b: 1, c: 1 });
  assertEquals(source.reads, 1);
});
