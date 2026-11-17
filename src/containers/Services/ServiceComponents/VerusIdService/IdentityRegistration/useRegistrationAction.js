import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRegistrationContext} from '../../../../../utils/identityRegistration';
import {verusIdUiError} from '../verusIdErrors';

export default function useRegistrationAction() {
  const context = useMemo(() => createRegistrationContext(), []);
  const mounted = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (operation, onSuccess) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await operation(context);
      if (mounted.current && onSuccess) {
        running.current = false;
        setBusy(false);
        onSuccess(result);
      }
      return result;
    } catch (failure) {
      if (mounted.current && failure.code !== 'SESSION_CHANGED') setError({
        ...verusIdUiError(failure, 'Unable to complete this step. Your registration is saved.'), code: failure.code,
      });
      return undefined;
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [context]);
  return {context, busy, error, run, running, setError};
}
