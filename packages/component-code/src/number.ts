const places = (step: number) => `${step}`.split('.')[1]?.length ?? 0;

/** A number's step: its last decimal place, `1` for `8` and `0.1` for `0.5`. */
export const stepOf = (value: number) => 10 ** -places(value);

/** A number written to its step's decimal places. */
export const round = (value: number, step: number) =>
  `${+value.toFixed(places(step))}`;
