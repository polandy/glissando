/** The entry at `index`; an index outside the list is a bug in the caller, not an `undefined`. */
export function item<T>(list: ArrayLike<T>, index: number): T {
  const value = list[index];
  if (value === undefined)
    throw new RangeError(`Index ${index} is outside a list of ${list.length}`);
  return value;
}

/**
 * The float at `index` of tensor data. A separate, monomorphic function: the generic `item` is
 * too slow inside the convolution loops, and a shape-checked index cannot miss.
 */
export function read(data: ArrayLike<number>, index: number): number {
  return data[index] ?? 0;
}
