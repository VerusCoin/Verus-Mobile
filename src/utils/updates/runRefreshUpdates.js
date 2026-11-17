// The refresh indicator stops after this time even when a request still
// waits. A late result still updates the screen when it arrives.
export const REFRESH_INDICATOR_LIMIT_MS = 20000;

const settle = async ({label, update}) => {
  try {
    await update();
  } catch (error) {
    console.warn(`Error forcing update to ${label}`);
    console.warn(error);
  }
};

/**
 * Runs the groups in order and the updates of one group side by side, so one
 * slow coin does not hold back the others. Resolves when every update has
 * settled or the limit has passed, whichever comes first. Never rejects.
 * @param {{label: string, update: () => Promise<any>}[][]} groups
 * @param {number} limitMs
 */
export const runRefreshUpdates = (groups, limitMs = REFRESH_INDICATOR_LIMIT_MS) => {
  let timer;
  const work = (async () => {
    for (const group of groups) {
      await Promise.all(group.map(settle));
    }
  })();
  const limit = new Promise(resolve => {
    timer = setTimeout(resolve, limitMs);
  });

  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
};
