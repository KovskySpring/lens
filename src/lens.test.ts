import { assertEquals } from "@std/assert";
import * as L from "./lens.ts";

function tracked<S, T>(
  lens: L.Lens<S, T>,
): L.Lens<S, T> & { tracked: { reads: number; writes: number } } {
  let reads = 0;
  let writes = 0;

  const originalGet = lens.get;
  const originalSet = lens.set;

  lens.get = (source: S) => {
    reads++;
    return originalGet(source);
  };

  lens.set = (valueOrReducer: T | ((current: T) => T)) => {
    writes++;
    return originalSet(valueOrReducer as Parameters<typeof originalSet>[0]);
  };

  return {
    ...lens,
    tracked: {
      get reads() {
        return reads;
      },
      get writes() {
        return writes;
      },
    },
  };
}

type Person = {
  name: string;
  age: number;
  address: { city: { name: string; code: string } };
};

const DEFAULT_PERSON: Person = {
  name: "ada",
  age: 36,
  address: { city: { name: "london", code: "LDN" } },
};

const person: Person = {
  name: "ada",
  age: 36,
  address: { city: { name: "london", code: "LDN" } },
};

const NameLens = L.lens<Person, string>({
  forward: (p) => p.name,
  backward: (p, name) => ({ ...p, name }),
});

const AgeLens = L.lens<Person, number>({
  forward: (p) => p.age,
  backward: (p, age) => ({ ...p, age }),
});

const CityLens = L.lens<Person, string>({
  forward: (p) => p.address.city.name,
  backward: (p, city) => ({
    ...p,
    address: {
      ...p.address,
      city: {
        ...p.address.city,
        name: city,
      },
    },
  }),
});

Deno.test("get() accessing a field of depth 1", () => {
  assertEquals(NameLens.get(person), DEFAULT_PERSON.name);
  assertEquals(AgeLens.get(person), DEFAULT_PERSON.age);
});

Deno.test("get() accessing a field of depth 2", () => {
  assertEquals(CityLens.get(person), DEFAULT_PERSON.address.city.name);
});

Deno.test("set(value) updates the correct field", () => {
  assertEquals(NameLens.set("grace")(person), {
    ...DEFAULT_PERSON,
    name: "grace",
  });

  assertEquals(AgeLens.set(42)(person), {
    ...DEFAULT_PERSON,
    age: 42,
  });

  assertEquals(CityLens.set("paris")(person), {
    ...DEFAULT_PERSON,
    address: {
      ...DEFAULT_PERSON.address,
      city: {
        ...DEFAULT_PERSON.address.city,
        name: "paris",
      },
    },
  });
});

Deno.test("set(reducer) updates the correct field", () => {
  assertEquals(NameLens.set((current) => current + " hopper")(person), {
    ...DEFAULT_PERSON,
    name: "ada hopper",
  });

  assertEquals(AgeLens.set((current) => current + 10)(person), {
    ...DEFAULT_PERSON,
    age: 46,
  });

  assertEquals(CityLens.set((current) => current.toUpperCase())(person), {
    ...DEFAULT_PERSON,
    address: {
      ...DEFAULT_PERSON.address,
      city: {
        ...DEFAULT_PERSON.address.city,
        name: "LONDON",
      },
    },
  });
});

type Nested = { a: { b: { c: string } } };

const NestedData: Nested = { a: { b: { c: "x" } } };

const NestedToALens = L.lens<Nested, Nested["a"]>({
  forward: (n) => n.a,
  backward: (n, a) => ({ ...n, a }),
});

const AToBLens = L.lens<Nested["a"], Nested["a"]["b"]>({
  forward: (a) => a.b,
  backward: (a, b) => ({ ...a, b }),
});

const BToCLens = L.lens<Nested["a"]["b"], Nested["a"]["b"]["c"]>({
  forward: (b) => b.c,
  backward: (b, c) => ({ ...b, c }),
});

Deno.test("set(value) on composed lens doesn't read from lower level lens", () => {
  const a = tracked(NestedToALens);
  const b = tracked(AToBLens);
  const c = tracked(BToCLens);
  const composed = tracked(L.compose(L.compose(a, b), c));
  const outcome = composed.set("y")(NestedData);
  assertEquals(outcome, { a: { b: { c: "y" } } });
  assertEquals(a.tracked.reads, 0, "a should not be read");
  assertEquals(b.tracked.reads, 0, "b should not be read");
  assertEquals(c.tracked.reads, 0, "c should not be read");
  assertEquals(composed.tracked.reads, 0, "composed should not be read");
  assertEquals(a.tracked.writes, 1, "a should be written to once");
  assertEquals(b.tracked.writes, 1, "b should be written to once");
  assertEquals(c.tracked.writes, 1, "c should be written to once");
  assertEquals(
    composed.tracked.writes,
    1,
    "composed should be written to once",
  );
});

Deno.test("get(source) on composed lens only read from lower level lens once", () => {
  const a = tracked(NestedToALens);
  const b = tracked(AToBLens);
  const c = tracked(BToCLens);
  const composed = tracked(L.compose(L.compose(a, b), c));
  const outcome = composed.get(NestedData);
  assertEquals(outcome, NestedData.a.b.c);
  assertEquals(a.tracked.reads, 1, "a should be read once");
  assertEquals(b.tracked.reads, 1, "b should be read once");
  assertEquals(c.tracked.reads, 1, "c should be read once");
  assertEquals(composed.tracked.reads, 1, "composed should be read once");
  assertEquals(a.tracked.writes, 0, "a should be written to once");
  assertEquals(b.tracked.writes, 0, "b should be written to once");
  assertEquals(c.tracked.writes, 0, "c should be written to once");
  assertEquals(
    composed.tracked.writes,
    0,
    "composed should be written to once",
  );
});
