# Lens for Typescript

[![JSR](https://jsr.io/badges/@tinymirror/lens)](https://jsr.io/@tinymirror/lens)

A simplifed implementation of lens from the wondrous world of functional
programming.

Lens allow you to focus on a specific part of a data structure, view and update
that part without needing to know the entire structure.

It is equivalent to "selectors" and "actions" in "reducers" patterns.

About [@tinymirror](https://jsr.io/@tinymirror)

> [@tinymirror](https://jsr.io/@tinymirror) is a collection of small, minimal packages
> that mirrors the feature set of bigger packages, but with a smaller footprint
> and a simpler API. [@tinymirror](https://jsr.io/@tinymirror) is meant for when your
> project need the functionality, but can't shoulder the weight of bundling another package.
> See [Best practice](https://jsr.io/@tinymirror/lens#best-practice) for more information
> on how to best approach [@tinymirror/lens](https://jsr.io/@tinymirror/lens).

## Installation

Published to [JSR](https://jsr.io) as
[@tinymirror/lens](https://jsr.io/@tinymirror/lens). You can install it using
whatever package manager you prefer:

In [deno](https://deno.land/),

```bash
deno add jsr:@tinymirror/lens
```

In [pnpm](https://pnpm.io/) 10.9+ and [yarn](https://yarnpkg.com/) 4.9+,

```bash
pnpm add jsr:@tinymirror/lens
```

```bash
yarn add jsr:@tinymirror/lens
```

In [npm](https://www.npmjs.com/), [bun](https://bun.sh/), and older versions of
[pnpm](https://pnpm.io/) or [yarn](https://yarnpkg.com/),

```bash
npx jsr add @tinymirror/lens
```

```bash
bunx jsr add @tinymirror/lens
```

```bash
yarn dlx jsr add @tinymirror/lens
```

```bash
pnpm dlx jsr add @tinymirror/lens
```

## Usage

A `Lens` is created with `lens`. It takes a `LensRecipe` to define
how to read the focused value out of the source (`LensRecipe.forward`)
and how to write an updated value back into it (`LensRecipe.backward`).

- `Lens.get` takes the source and returns the focused value.
- `Lens.set` takes the new value (or a reducer that derives it from the current
  one) and returns a reducer `(source) => source` that applies the change to the
  source.

**Pitfalls**: The focused value must not be a function. `Lens.set` assumes every
function passed to it is a reducer function that takes the current value and
returns a new value. If the focused value is a function, it will be called
rather than being set as the new value.

```ts
import lens from "@tinymirror/lens";

type Person = {
  name: string;
  info: {
    height: number;
    age: number;
  };
};

const person: Person = { name: "ada", info: { height: 5.5, age: 36 } };

const age = lens<Person, number>({
  forward: (person) => person.info.age,
  backward: (person, age) => ({ ...person, info: { ...person.info, age } }),
});

age.get(person); // 36

const older = age.set(37)(person); // { name: "ada", info: { height: 5.5, age: 37 } }
const evenOlder = age.set((current) => current + 1)(older); // { ...older, info: { ..., age: 38 } }
```

`Lens` does not have to be limited to getters, setters. `LensRecipe.forward` can
be used to compute and derive a value from a large/global data structure. In
this case, `LensRecipe.backward` must be aware of how to apply changes to the
derived value back to the source data structure.

```ts
import lens from "@tinymirror/lens";

type PackageInfo = {
  // ? Assumes package scope is required and separated
  // from package name by the character "/".
  name: string;
  version: string;
};

const info: PackageInfo = { name: "tinymirror/lens", version: "1.0.0" };

const scope = lens<PackageInfo, string>({
  forward: ({ name }) => {
    const parts = name.split("/");
    return parts[0];
  },
  backward: (info, scope) => {
    const parts = info.name.split("/");
    parts[0] = scope;
    return { ...info, name: parts.join("/") };
  },
});

scope.get(info); // "tinymirror"
scope.set("tiny")(info); // { name: "tiny/lens", version: "1.0.0" }
scope.set((current) => current.toUpperCase())(info); // { name: "TINYMIRROR/lens", version: "1.0.0" }
```

### Composition

Joins two lens with `compose`. Use `extend` to compose with a `LensRecipe`
instead of a `Lens`.

```ts
import lens, { compose, extend } from "@tinymirror/lens";

type App = {
  user: {
    name: string;
    address: { city: string; country: string };
  };
};

const app: App = {
  user: { name: "ada", address: { city: "london", country: "uk" } },
};

const user = lens<App, App["user"]>({
  forward: (app) => app.user,
  backward: (app, user) => ({ ...app, user }),
});

const address = lens<App["user"], App["user"]["address"]>({
  forward: (user) => user.address,
  backward: (user, address) => ({ ...user, address }),
});

// `Lens<App, App["user"]>` and `Lens<App["user"], Address>` -> `Lens<App, Address>`
const userAddress = compose(user, address);

// the same, but the last step is given as a recipe instead of a lens
const city = extend(userAddress, {
  forward: (address) => address.city,
  backward: (address, city) => ({ ...address, city }),
});

city.get(app); // "london"
city.set("paris")(app); // { user: { name: "ada", address: { city: "paris", country: "uk" } } }
```

## Best practice

[@tinymirror/lens](https://jsr.io/@tinymirror/lens), in the spirit of
[@tinymirror](https://jsr.io/@tinymirror), is meant to be a small, minimal
package.

### Memoization

`Lens` does no caching. `LensRecipe.forward` runs on every `Lens.get`, and it
also runs when the reducer returned by `Lens.set` is applied with a reducer
argument, since the current value is needed to compute the next one. Setting a
plain value skips that read and only calls `LensRecipe.backward`. This keeps the
package simple and unopinionated. You are expected to cache the getter if it is
expensive (e.g. making calculation to derive a value from a large data
structure). If you are just accessing a field/property/index, it is fine to
leave as is. This type of caching is often referred to as memoization.

### Very deeply composed lens

`Lens` uses `LensRecipe.forward` and `LensRecipe.backward` to derive a value
from a source data structure. Composed `Lens` have no idea how the other `Lens`
is structured so no flattening of the access path can be done. More
feature-complete packages create lens by defining property paths and indexing
(e.g. using `.k(["user", "info", "name"])` to access `user.info.name`) allowing
them to resolve the access path of composed lens at runtime and access the
values directly or in a loop.

In [@tinymirror/lens](https://jsr.io/@tinymirror/lens), access is facilitated by
calling functions, making it stack-sensitive. Every level added by `compose` or
`extend` is another pair of `LensRecipe.forward`/ `LensRecipe.backward` calls,
and every write rebuilds the source one level at a time. Deeply nested lens can
use a lot of the stack and impact memory usage. Though possible for very deeply
composed/nested lens, it's not likely you'd run into a stack-overflow. Overall,
It is recommended that you avoid composing lens too many levels deep. Instead,
consider creating a new, singular lens that directly accesses the value you want
to focus on.

## Documentation

View the detailed documentation at
[jsr.io/@tinymirror/lens](https://jsr.io/@tinymirror/lens).

## Contribution

This project is licensed under the
[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

Contributions are welcomed. Create an issue or start a discussion at
[github.com/KovskySpring/lens](https://github.com/KovskySpring/lens).

The project uses [mise-en-place](https://mise.jdx.dev/) as the tooling manager
and [Deno](https://deno.land/) as the runtime. If you already use mise-en-place,
simply review
[mise.toml](https://github.com/KovskySpring/lens/blob/main/mise.toml) and run
`mise trust` to setup your environment.

Otherwise, install [Deno](https://deno.land/) and reference the tasks defined in
[mise.toml](https://github.com/KovskySpring/lens/blob/main/mise.toml) to
manually run tasks yourself.
