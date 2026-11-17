import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'homeValueChart:open:v1';
let cached;
let writes = Promise.resolve();
// Start once, before Home mounts, alongside the portfolio record read.
const read = AsyncStorage.getItem(KEY).then((value) => {
  if (cached === undefined) cached = value === 'open';
}).catch(() => { if (cached === undefined) cached = false; });

const useHomeChartPreference = () => {
  const [preference, setPreference] = useState(() => ({ expanded: cached === true, hydrated: cached !== undefined }));

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (!active) return;
      // A stalled read must not keep Home hidden or override a later toggle.
      if (cached === undefined) cached = false;
      setPreference({ expanded: cached, hydrated: true });
    };
    const timer = setTimeout(finish, 400);
    read.then(() => { clearTimeout(timer); finish(); });
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const setExpanded = useCallback((expanded) => {
    cached = expanded;
    setPreference({ expanded, hydrated: true });
    // Keep the last tap last on disk. A failed save still keeps the session choice.
    writes = writes.then(() => AsyncStorage.setItem(KEY, expanded ? 'open' : 'closed')).catch(() => {});
  }, []);

  return { ...preference, setExpanded };
};

export default useHomeChartPreference;
