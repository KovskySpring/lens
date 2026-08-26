/**
 * The simplified version of {@linkcode Lens} interface
 * for when the full {@linkcode Lens} object may not be available.
 *
 * Lens focus on a specific part of a data structure.
 * It allows you to view and update that part of the data structure
 * without having knowledge of the entire structure.
 *
 * @template T - The type of the value that the lens focuses on.
 */
export interface LensLike<T> {
  /**
   * Gets the value that the lens focuses on.
   *
   * @returns The value that the lens focuses on.
   */
  get(): T;

  /**
   * Sets the value that the lens focuses on.
   * @param value - The new value to set.
   */
  set(value: T): void;

  /**
   * Sets the value that the lens focuses on using a reducer function.
   *
   * @param reducer - A function that takes the current value and returns a new value.
   */
  set(reducer: (current: T) => T): void;
}

/**
 * Lens focus on a specific part of a data structure.
 * It allows you to view and update that part of the data structure
 * without having knowledge of the entire structure.
 *
 * @template S - The type of the source data structure.
 * @template T - The type of the value that the lens focuses on.
 */
export interface Lens<S, T> extends LensLike<T> {
  /**
   * The recipe that was used to create this {@linkcode Lens}.
   */
  recipe: LensRecipe<S, T>;
}

/**
 * The recipe for creating a {@linkcode Lens}.
 * It defines how to access and update the value that the lens focuses on
 * from the source data structure.
 *
 * @template S - The type of the source data structure.
 * @template T - The type of the value that the lens focuses on.
 */
export interface LensRecipe<S, T> {
  /**
   * The source data structure.
   */
  source: LensLike<S>;

  /**
   * Transforms the source data structure into the value that the lens focuses on.
   * Used by the lens to derive the value from the source data structure.
   *
   * @param state - The source data structure.
   * @returns The value that the lens focuses on.
   */
  forward(state: S): T;

  /**
   * Transforms the updated value back into the source data structure.
   * Used by the lens to update the source data structure with the new value.
   * @param state - The source data structure.
   * @param derived - The new value that the lens focuses on.
   * @returns A new source data structure with the updated value.
   */
  backward(state: S, derived: T): S;
}

/**
 * Creates a {@linkcode Lens} from a {@linkcode LensRecipe}.
 *
 * @template S - The type of the source data structure.
 * @template T - The type of the value that the lens focuses on.
 * @param recipe - The recipe for creating the lens.
 * @returns A new {@linkcode Lens} that focuses on a specific part of the source data structure.
 */
export function lens<S, T>(
  recipe: LensRecipe<S, T>,
): Lens<S, T> {
  return {
    recipe,
    get: () => recipe.forward(recipe.source.get()),
    set: (valueOrReducer) => {
      if (typeof valueOrReducer !== "function") {
        const value = valueOrReducer as T;
        recipe.source.set((currentSource) =>
          recipe.backward(currentSource, value)
        );
        return;
      }

      const reduce = valueOrReducer as (current: T) => T;
      recipe.source.set((currentSource) => {
        const currentDerived = recipe.forward(currentSource);
        const newDerived = reduce(currentDerived);
        return recipe.backward(currentSource, newDerived);
      });
    },
  };
}

export default lens;
