// Teardown contexts are routinely spread, logged as part of errors, and
// passed through non-DLight channel managers. Keep the plaintext DLight seed
// behind a non-enumerable symbol so ordinary cloning/serialization cannot
// accidentally copy it. The mutable holder lets every owner clear its
// reference promptly even though JavaScript strings themselves cannot be
// zeroized.
const DLIGHT_TEARDOWN_SEED_KEY = Symbol.for(
  'verus.mobile.dlightTeardownSeed.v1',
);

export const setDlightTeardownSeed = (context, seed) => {
  if (context == null) return context;

  // Sanitize the legacy enumerable field if a caller supplied one.
  if (Object.prototype.hasOwnProperty.call(context, 'dlightSeed')) {
    context.dlightSeed = null;
    delete context.dlightSeed;
  }

  const existing = context[DLIGHT_TEARDOWN_SEED_KEY];
  if (existing != null) existing.value = null;
  delete context[DLIGHT_TEARDOWN_SEED_KEY];

  if (seed != null) {
    Object.defineProperty(context, DLIGHT_TEARDOWN_SEED_KEY, {
      configurable: true,
      enumerable: false,
      value: {value: seed},
      writable: false,
    });
  }

  return context;
};

export const getDlightTeardownSeed = context =>
  context?.[DLIGHT_TEARDOWN_SEED_KEY]?.value ??
  context?.dlightSeed ??
  null;

export const clearDlightTeardownSeed = context => {
  if (context == null) return;
  const holder = context[DLIGHT_TEARDOWN_SEED_KEY];
  if (holder != null) holder.value = null;
  delete context[DLIGHT_TEARDOWN_SEED_KEY];

  if (Object.prototype.hasOwnProperty.call(context, 'dlightSeed')) {
    context.dlightSeed = null;
    delete context.dlightSeed;
  }
};

export const takeDlightTeardownSeed = context => {
  const seed = getDlightTeardownSeed(context);
  clearDlightTeardownSeed(context);
  return seed;
};
