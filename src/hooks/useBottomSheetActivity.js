import {useLayoutEffect, useSyncExternalStore} from 'react';

const activeSheets = new Set();
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());
const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => activeSheets.size > 0;

// Track the rendered sheet, including its closing animation and unmount.
export const useTrackBottomSheetActivity = visible => {
  useLayoutEffect(() => {
    if (!visible) return undefined;
    const token = {};
    activeSheets.add(token);
    notify();
    return () => {
      activeSheets.delete(token);
      notify();
    };
  }, [visible]);
};

export const isBottomSheetActive = getSnapshot;
export default function useBottomSheetActivity() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
