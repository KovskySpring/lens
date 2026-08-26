import { assertEquals, assertStrictEquals } from "@std/assert";
import lens, { type LensLike } from "./lens.ts";

function cell<T>(initial: T): LensLike<T> & { value: T } {
  return {
    value: initial,
    get() {
      return this.value;
    },
    set(next: T) {
      this.value = next;
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
