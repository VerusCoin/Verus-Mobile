import {NativeModules} from 'react-native';

const keepAwake = NativeModules.VerusKeepAwake;
let activeLocks = 0;

export const activateKeepAwake = () => {
  activeLocks += 1;
  if (activeLocks === 1) {
    try {
      keepAwake?.activate?.();
    } catch (e) {
      // Keep backup/restore usable if a stale native build lacks the module.
    }
  }
};

export const deactivateKeepAwake = () => {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0) {
    try {
      keepAwake?.deactivate?.();
    } catch (e) {
      // No-op fallback; callers should not fail because sleep prevention did.
    }
  }
};

export const withKeepAwake = async task => {
  activateKeepAwake();

  try {
    return await task();
  } finally {
    deactivateKeepAwake();
  }
};
