/**
 * The recipe for creating a {@linkcode Lens}. It defines how to access
 * and update the value that the lens focuses on by reading the source
 * data.
 *
 * @template S The source type.
 * @template T The target type.
 */
export interface LensRecipe<S, T> {
  /**
   * Transforms the source data structure into the target value.
   *
   * @param state The source.
   * @returns The target.
   */
  forward(state: S): T;

  /**
   * Transforms the updated value back into the source data structure.
   *
   * @param state The source.
   * @param derived The target.
   * @returns An updated state for the source.
   */
  backward(state: S, derived: T): S;
}

/**
 * Lens focus on a specific part of a data structure.
 * It allows you to view and update that part of the data structure
 * without having knowledge of the entire structure.
 *
 * @template S The type of the source data structure.
 * @template T The type of the target value.
 */
export interface Lens<S, T> {
  /**
   * Gets the target value.
   *
   * @param source The source.
   * @returns The target.
   */
  get(source: S): T;

  /**
   * Sets the target value.
   *
   * @param value The new value to set.
   * @returns A reducer function that takes the source and returns
   * an updated source with the new value set.
   */
  set(value: T): (source: S) => S;

  /**
   * Sets the target value using a reducer function.
   *
   * @param reducer A reducer that takes the current value and
   * returns a new value.
   * @returns A reducer that takes the source and returns an
   * updated source with the new value set.
   */
  set(reducer: (current: T) => T): (source: S) => S;
}

/**
 * A utility type that extracts the setter function type from a {@linkcode Lens}.
 *
 * @template T The type of the {@linkcode Lens} from which to extract the setter function type.
 * @returns The type of the setter function for the lens, or `never` if `T` is not a valid lens type.
 */
export type Setter<T> = T extends Lens<infer _, infer V> ? (current: V) => V
  : never;

/**
 * Creates a {@linkcode Lens} from a {@linkcode LensRecipe}.
 *
 * @template S The source type.
 * @template T The target type.
 * @param recipe The {@linkcode LensRecipe} to define the {@linkcode Lens}.
 * @returns A new {@linkcode Lens}.
 */
export function lens<S, T>(recipe: LensRecipe<S, T>): Lens<S, T> {
  return {
    get(source) {
      return recipe.forward(source);
    },

    set(valueOrReducer) {
      if (typeof valueOrReducer !== "function") {
        return (source) => recipe.backward(source, valueOrReducer);
      }

      const reduce = valueOrReducer as (current: T) => T;

      return (source) => {
        const currentDerived = recipe.forward(source);
        const newDerived = reduce(currentDerived);
        return recipe.backward(source, newDerived);
      };
    },
  };
}

/**
 * Extends a {@linkcode Lens} with a {@linkcode LensRecipe}
 *
 * @template A The source type of the original lens.
 * @template B The target type of the original lens and the source
 * type of the recipe.
 * @template C The target type.
 * @param src The original {@linkcode Lens}.
 * @param recipe The {@linkcode LensRecipe} to extend the lens with.
 * @returns A new {@linkcode Lens}.
 */
export function extend<A, B, C>(
  src: Lens<A, B>,
  recipe: LensRecipe<B, C>,
): Lens<A, C> {
  const second = lens(recipe);
  return compose(src, second);
}

/**
 * Composes two {@linkcode Lens} instances into a new {@linkcode Lens}.
 *
 * @template A The source type of the first lens.
 * @template B The target type of the first lens and the source type of
 * the second lens.
 * @template C The target type of the second lens.
 * @param first The first {@linkcode Lens}.
 * @param second The second {@linkcode Lens}.
 * @returns A new {@linkcode Lens}.
 */
export function compose<A, B, C>(
  first: Lens<A, B>,
  second: Lens<B, C>,
): Lens<A, C> {
  return {
    get(source: A): C {
      const b = first.get(source);
      return second.get(b);
    },

    set(valueOrReducer: C | ((current: C) => C)) {
      const reducer = valueOrReducer as Parameters<typeof second.set>[0];
      return first.set(second.set(reducer));
    },
  };
}

export default lens;
