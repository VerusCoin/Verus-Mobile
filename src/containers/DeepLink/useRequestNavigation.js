import {createContext, useContext, useLayoutEffect, useRef} from 'react';

export const RequestNavigationContext = createContext(null);

// A request keeps one exit guard in DeepLink. Detail screens supply their
// existing Back/Done action and lock it while a response is being prepared.
export const useRequestBackHandler = (
  onBack,
  blocked = false,
  priority = 1,
  enabled = true,
) => {
  const handlers = useContext(RequestNavigationContext);
  const current = useRef(null);
  current.current = {onBack, blocked, priority};

  useLayoutEffect(() => {
    if (!handlers || !enabled) return undefined;
    const token = {};
    handlers.set(token, current);
    return () => handlers.delete(token);
  }, [enabled, handlers]);
};

export const getRequestBackState = handlers => {
  let selected = null;
  let blocked = false;
  handlers.forEach(ref => {
    const handler = ref.current;
    blocked = blocked || handler.blocked;
    if (!selected || handler.priority > selected.priority) selected = handler;
  });
  return {onBack: selected?.onBack, blocked};
};
