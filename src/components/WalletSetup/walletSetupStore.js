import {useSyncExternalStore} from 'react';

/*
  One wallet setup at a time. Onboarding reports the real setup steps here,
  the root WalletSetupOverlay shows them, and Home lends its asset row logos
  as the landing spots for the coins when setup ends (owner chose
  variation E, 2026-10-22).
*/

const IDLE = {visible: false, phase: 'idle', hiddenLogoIds: []};

// Setup work blocks the JS thread, so each step waits until the screen has
// shown it. A step resolves anyway after this long if the screen is gone.
const SHOWN_TIMEOUT = 2000;

// A landing coin and its Home row logo cross-fade for this long.
export const WALLET_SETUP_HANDOFF = 150;

let state = IDLE;
let runId = 0;
let finishResolvers = [];
let shownWaiters = new Map();
const listeners = new Set();
const targets = new Map();

// The steps the screen shows, in order: one per starting coin's key, then
// the later steps. A key with no coin on screen (BTC on testnet) is not one.
export const getWalletSetupUnits = setup => [
  ...setup.coins.map(coin => ({
    key: `key:${coin.startId}`,
    type: 'key',
    coinId: coin.coinId,
    startId: coin.startId,
  })),
  {key: 'encrypted', type: 'encrypted'},
  {key: 'assets', type: 'assets'},
  ...(setup.biometryName ? [{key: 'biometrics', type: 'biometrics'}] : []),
  {key: 'opened', type: 'opened'},
];

const getStepKey = step =>
  step.type === 'key' ? `key:${step.coinId}` : step.type;

const waitUntilShown = key =>
  new Promise(resolve => {
    const timer = setTimeout(() => {
      shownWaiters.delete(key);
      resolve();
    }, SHOWN_TIMEOUT);

    shownWaiters.set(key, () => {
      clearTimeout(timer);
      resolve();
    });
  });

const resolveShownWaiters = () => {
  const waiters = shownWaiters;
  shownWaiters = new Map();
  waiters.forEach(resolve => resolve());
};

// The screen calls this once it has painted, and after it shows each unit.
export const markWalletSetupShown = (key = 'screen') => {
  const resolve = shownWaiters.get(key);

  if (resolve) {
    shownWaiters.delete(key);
    resolve();
  }
};

const emit = () => listeners.forEach(listener => listener());

const update = patch => {
  state = {...state, ...patch};
  emit();
};

export const subscribeWalletSetup = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getWalletSetupState = () => state;

export const useWalletSetupState = () =>
  useSyncExternalStore(subscribeWalletSetup, getWalletSetupState);

/**
 * Shows the setup screen. Resolves once the screen has painted.
 * @param {{
 *   walletName: string,
 *   walletAvatar: object,
 *   coins: Array<{coinId: string, startId: string, presentation: object}>,
 *   biometryName: ?string,
 *   restoring: boolean,
 * }} setup
 */
export const showWalletSetup = setup => {
  runId += 1;
  resolveShownWaiters();
  state = {
    ...setup,
    visible: true,
    phase: 'running',
    runId,
    keysMade: [],
    stepsDone: [],
    error: null,
    hiddenLogoIds: [],
  };
  const shown = waitUntilShown('screen');
  emit();

  return shown;
};

/**
 * Records a finished setup step: {type: 'key', coinId} for each derived key,
 * then 'encrypted', 'assets', 'biometrics' and 'opened'. Resolves when the
 * screen has shown it.
 */
export const reportWalletSetupStep = step => {
  if (!state.visible || state.phase !== 'running' || step == null) {
    return Promise.resolve();
  }

  const key = getStepKey(step);
  const shown = getWalletSetupUnits(state).some(unit => unit.key === key)
    ? waitUntilShown(key)
    : Promise.resolve();

  if (step.type === 'key') {
    if (!state.keysMade.includes(step.coinId)) {
      update({keysMade: [...state.keysMade, step.coinId]});
    }
  } else if (!state.stepsDone.includes(step.type)) {
    update({stepsDone: [...state.stepsDone, step.type]});
  }

  return shown;
};

// Resolves when the screen has handed over and closed. Without landOnHome
// (a saved request opens next) the coins fade instead of flying to Home.
export const finishWalletSetup = ({landOnHome = true} = {}) =>
  new Promise(resolve => {
    if (!state.visible) {
      resolve();
      return;
    }

    finishResolvers.push(resolve);
    update({phase: 'finishing', landOnHome});
  });

/**
 * Shows the failure on the setup screen. Returns false when no setup
 * screen is open, so the caller can show the failure another way.
 * @param {{title: string, message: string, primaryLabel: string,
 *   onPrimary: Function, secondaryLabel?: string, onSecondary?: Function}} error
 */
export const failWalletSetup = error => {
  if (!state.visible) return false;
  update({phase: 'failed', error});
  return true;
};

// With a runId, closes only that run, so a late timer cannot close a newer one.
export const closeWalletSetup = closingRunId => {
  if (closingRunId != null && closingRunId !== state.runId) return;

  state = IDLE;
  resolveShownWaiters();
  emit();

  const resolvers = finishResolvers;
  finishResolvers = [];
  resolvers.forEach(resolve => resolve());
};

// Home hides these row logos while their coins fly in.
export const setWalletSetupHiddenLogos = coinIds => {
  update({hiddenLogoIds: coinIds});
};

export const useWalletSetupLogoHidden = coinId =>
  useSyncExternalStore(subscribeWalletSetup, () =>
    state.hiddenLogoIds.includes(coinId),
  );

export const registerWalletSetupTarget = (coinId, view) => {
  if (coinId == null || view == null) return () => {};

  targets.set(coinId, view);

  return () => {
    if (targets.get(coinId) === view) targets.delete(coinId);
  };
};

const measureTarget = coinId =>
  new Promise(resolve => {
    const view = targets.get(coinId);

    if (view == null || typeof view.measureInWindow !== 'function') {
      resolve(null);
      return;
    }

    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? {x, y, width, height} : null),
    );
  });

// Window rectangles of Home's row logos, or null for a row that is missing.
export const measureWalletSetupTargets = coinIds =>
  Promise.all(coinIds.map(measureTarget));
