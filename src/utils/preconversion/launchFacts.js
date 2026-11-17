import BigNumber from 'bignumber.js';

// Verus and its PBaaS chains aim at one block a minute.
export const DEFAULT_SECONDS_PER_BLOCK = 60;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// How far away a launch is, coarse on purpose: block times vary, so "in 6
// days" is honest where "in 6 days 3 hours 12 minutes" is not.
export const formatLaunchCountdown = seconds => {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < HOUR) {
    const minutes = Math.max(1, Math.round(value / MINUTE));
    return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  if (value < 2 * DAY) {
    const hours = Math.round(value / HOUR);
    return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  if (value < 60 * DAY) return `in ${Math.round(value / DAY)} days`;
  if (value < 2 * 365 * DAY) {
    return `in about ${Math.round(value / (30.44 * DAY))} months`;
  }
  return `in about ${Math.round(value / (365.25 * DAY))} years`;
};

export const formatLaunchDate = date =>
  date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

// The facts of a pre-launch currency that a person needs before they send
// funds to it. `definition` is the daemon's currency definition; `height` is
// the launch system's current block height. The start block counts on the
// launch system, also for a PBaaS chain.
export const getLaunchFacts = (
  definition,
  {height, secondsPerBlock = DEFAULT_SECONDS_PER_BLOCK, now = Date.now()} = {},
) => {
  if (!definition) return null;
  const startBlock = Number(definition.startblock);
  const currentHeight = Number(height);
  const timed =
    Number.isFinite(startBlock) && startBlock > 0 &&
    height != null && Number.isFinite(currentHeight);
  const blocksLeft = timed ? Math.max(0, startBlock - currentHeight) : null;
  const secondsLeft =
    blocksLeft == null ? null : blocksLeft * (secondsPerBlock || DEFAULT_SECONDS_PER_BLOCK);
  const launchDate = secondsLeft == null ? null : new Date(now + secondsLeft * 1000);
  const currencies = Array.isArray(definition.currencies) ? definition.currencies : [];
  const amountsFor = values =>
    (Array.isArray(values) ? values : [])
      .map((amount, index) => ({currencyId: currencies[index], amount: BigNumber(amount)}))
      .filter(item => item.currencyId && item.amount.isFinite() && item.amount.isGreaterThan(0))
      .map(item => ({currencyId: item.currencyId, amount: item.amount.toFixed()}));
  const weights = Array.isArray(definition.weights) ? definition.weights : [];
  const initialSupply = BigNumber(definition.initialsupply);

  return {
    currencyId: definition.currencyid,
    name: definition.fullyqualifiedname || definition.name || definition.currencyid,
    startBlock: Number.isFinite(startBlock) ? startBlock : null,
    blocksLeft,
    countdown: secondsLeft == null ? null : formatLaunchCountdown(secondsLeft),
    launchDate,
    dateLabel: formatLaunchDate(launchDate),
    minimums: amountsFor(definition.minpreconversion),
    maximums: amountsFor(definition.maxpreconversion),
    reserves: currencies.map((currencyId, index) => ({
      currencyId,
      weight: weights[index] == null ? null : Number(weights[index]),
    })),
    initialSupply:
      initialSupply.isFinite() && initialSupply.isGreaterThan(0)
        ? initialSupply.toFixed()
        : null,
    // Currency ID → name for the currencies it holds, as the daemon names them.
    // The wallet may not know a reserve that is not one of its assets.
    names:
      definition.currencynames && typeof definition.currencynames === 'object'
        ? definition.currencynames
        : {},
  };
};

// "In 6 days, 29 Oct 2026", or the part that is known.
export const formatLaunchWhen = facts => {
  if (!facts?.countdown) return facts?.startBlock ? `At block ${facts.startBlock}` : null;
  const countdown = facts.countdown.charAt(0).toUpperCase() + facts.countdown.slice(1);
  return facts.dateLabel ? `${countdown}, ${facts.dateLabel}` : countdown;
};

// "At launch, 29 Oct 2026": when pre-converted funds arrive.
export const formatArrivesAtLaunch = facts =>
  facts?.dateLabel ? `At launch, ${facts.dateLabel}` : 'At launch';
