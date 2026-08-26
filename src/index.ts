/**
 * # Lens for Typescript
 *
 * [![JSR](https://jsr.io/badges/@tinymirror/lens)](https://jsr.io/@tinymirror/lens)
 *
 * A simplifed implementation of lens from the wondrous world of functional programming.
 *
 * Lens allow you to focus on a specific part of a data structure,
 * view and update that part without needing to know the entire structure.
 *
 * It is equivalent to "selectors" and "actions" in "reducers" patterns.
 *
 * ## Installation
 *
 * Published to [JSR](https://jsr.io) as [@tinymirror/lens](https://jsr.io/@tinymirror/lens).
 * You can install it using whatever package manager you prefer:
 *
 * In [deno](https://deno.land/),
 *
 * ```bash
 * deno add jsr:@tinymirror/lens
 * ```
 *
 * In [pnpm](https://pnpm.io/) 10.9+ and [yarn](https://yarnpkg.com/) 4.9+,
 *
 * ```bash
 * pnpm add jsr:@tinymirror/lens
 * ```
 *
 * ```bash
 * yarn add jsr:@tinymirror/lens
 * ```
 *
 * In [npm](https://www.npmjs.com/), [bun](https://bun.sh/),
 * and older versions of [pnpm](https://pnpm.io/) or [yarn](https://yarnpkg.com/),
 *
 * ```bash
 * npx jsr add @tinymirror/lens
 * ```
 *
 * ```bash
 * bunx jsr add @tinymirror/lens
 * ```
 *
 * ```bash
 * yarn dlx jsr add @tinymirror/lens
 * ```
 *
 * ```bash
 * pnpm dlx jsr add @tinymirror/lens
 * ```
 *
 * ## Usage
 *
 * {@linkcode Lens} can be created using {@linkcode lens}.
 * It takes a {@linkcode LensRecipe} as an argument,
 * which defines how to access and update the value that the lens
 * focuses on from the source data structure.
 *
 * They can be used as simple getters and setters for a large, global
 * data structure.
 *
 * **Pitfalls**: The derived value must not be a function. {@linkcode Lens.set}
 * assumes every function passed to it is a reducer function that takes the current
 * value and returns a new value. If the derived value is a function, it will be called
 * rather than being set as the new value.
 *
 * ```ts
 * import lens from "@tinymirror/lens";
 *
 * type Person = {
 *   name: string;
 *   info: {
 *     height: number;
 *     age: number;
 *   };
 * };
 *
 * // example store
 * let person: Person = { name: "ada", info: { height: 5.5, age: 36 } };
 *
 * const store = {
 *   getPerson: () => person,
 *   setPerson: (next: Person | ((current: Person) => Person)) => {
 *     person = typeof next === "function" ? next(person) : next;
 *   },
 * };
 *
 * const age = lens({
 *   source: {
 *     get: () => store.getPerson(),
 *     set: (next) => store.setPerson(next),
 *   },
 *   forward: (person) => person.info.age,
 *   backward: (person, age) => ({ ...person, info: { ...person.info, age } }),
 * });
 *
 * age.get(); // 36
 * age.set(37); // state is now { name: "ada", age: 37 }
 * age.set((current) => current + 1); // state is now { name: "ada", age: 38 }
 * ```
 *
 * {@linkcode Lens} does not have to be limited to getters, setters.
 * {@linkcode LensRecipe.forward} can be used to compute and derive a value
 * from a large/global data structure.
 * In this case, {@linkcode LensRecipe.backward} must be aware of how to
 * apply changes to the derived value back to the source data structure.
 *
 * ```ts
 * import lens from "@tinymirror/lens";
 *
 * type PackageInfo = {
 *   // ? Assumes package scope is required and separated
 *   // from package name by the character "/".
 *   name: string;
 *   version: string;
 * };
 *
 * // example store
 * let info: PackageInfo = { name: "tinymirror/lens", version: "1.0.0" };
 *
 * const store = {
 *   getPackageInfo: () => info,
 *   setPackageInfo: (
 *     next: PackageInfo | ((current: PackageInfo) => PackageInfo),
 *   ) => {
 *     info = typeof next === "function" ? next(info) : next;
 *   },
 * };
 *
 * const scope = lens({
 *   source: {
 *     get: () => store.getPackageInfo(),
 *     set: (next) => store.setPackageInfo(next),
 *   },
 *   forward: ({ name }) => {
 *     const parts = name.split("/");
 *     return parts[0];
 *   },
 *   backward: (info, scope) => {
 *     const parts = info.name.split("/");
 *     parts[0] = scope;
 *     return { ...info, name: parts.join("/") };
 *   },
 * });
 *
 * scope.get(); // "tinymirror"
 * scope.set("tiny"); // state is now { name: "tiny/lens", version: "1.0.0" }
 * scope.set((current) => current.toUpperCase()); // state is now { name: "TINY/lens", version: "1.0.0" }
 * ```
 *
 * ## Documentation
 *
 * View the detailed documentation at [jsr.io/@tinymirror/lens](https://jsr.io/@tinymirror/lens).
 *
 * ## Contribution
 *
 * This project is licensed under the
 * [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
 *
 * Contributions are welcomed. Create an issue or start a discussion at
 * [github.com/KovskySpring/lens](https://github.com/KovskySpring/lens).
 *
 * The project uses [mise-en-place](https://mise.jdx.dev/) as the tooling manager and
 * [Deno](https://deno.land/) as the runtime. If you already use mise-en-place,
 * simply review [mise.toml](https://github.com/KovskySpring/lens/blob/main/mise.toml)
 * and run `mise trust` to setup your environment.
 *
 * Otherwise, install [Deno](https://deno.land/) and reference the tasks
 * defined in [mise.toml](https://github.com/KovskySpring/lens/blob/main/mise.toml)
 * to manually run tasks yourself.
 *
 * @module
 */
export * from "./lens.ts";
export { default } from "./lens.ts";
