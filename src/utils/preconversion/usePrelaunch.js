import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {getLaunchFacts} from './launchFacts';
import {
  getChainHeight,
  getCurrencyNames,
  getOwnPreconversions,
  getPrelaunchCurrencies,
  peekChainHeight,
  peekPrelaunchCurrencies,
  totalPreconverted,
} from './prelaunchData';

// The launch system's block height, for countdowns. null until known.
export const useChainHeight = systemId => {
  const [height, setHeight] = useState(() =>
    systemId ? peekChainHeight(systemId) ?? null : null,
  );
  useEffect(() => {
    if (!systemId) return undefined;
    let active = true;
    getChainHeight(systemId)
      .then(value => {
        if (active) setHeight(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [systemId]);
  return height;
};

// A Verus currency that is not its chain's own coin can be pre-launch.
const canBePrelaunch = coin =>
  coin?.proto === 'vrsc' &&
  Boolean(coin.currency_id) &&
  Boolean(coin.system_id) &&
  coin.currency_id !== coin.system_id;

const cardAddresses = (cards, systemId) =>
  (cards || [])
    .map(card => String(card?.channel || '').split('.'))
    .filter(parts => parts[0] === 'vrpc' && parts[1] && parts[2] === systemId)
    .map(parts => parts[1]);

// What the wallet knows from cache now, so a screen does not draw the normal
// asset layout first and then switch.
const peekPrelaunch = coin => {
  if (!canBePrelaunch(coin)) return false;
  const entries = peekPrelaunchCurrencies(coin.system_id);
  return entries ? entries.has(coin.currency_id) : null;
};

// Pre-launch assets among `coins`: coin ID → {facts, preconversions, totals}.
// It reloads whenever the screen gains focus. `cardsByCoin` gives each asset's
// cards; their addresses are the ones whose pre-conversions count.
export const usePrelaunchAssets = (coins, cardsByCoin) => {
  const candidates = useMemo(
    () => (coins || []).filter(canBePrelaunch),
    [coins],
  );
  const candidateKey = candidates
    .map(coin => `${coin.id}:${coin.currency_id}:${coin.system_id}`)
    .join('|');
  const addressKey = candidates
    .map(coin => `${coin.id}=${cardAddresses(cardsByCoin?.[coin.id], coin.system_id).join(',')}`)
    .join('|');
  const [assets, setAssets] = useState(() => new Map());
  const latest = useRef({candidates, cardsByCoin});
  latest.current = {candidates, cardsByCoin};

  const load = useCallback(async () => {
    const {candidates: coinsToCheck, cardsByCoin: cards} = latest.current;
    const bySystem = new Map();
    coinsToCheck.forEach(coin => {
      bySystem.set(coin.system_id, [...(bySystem.get(coin.system_id) || []), coin]);
    });
    const next = new Map();

    await Promise.all(
      [...bySystem.entries()].map(async ([systemId, systemCoins]) => {
        let prelaunch;
        try {
          prelaunch = await getPrelaunchCurrencies(systemId);
        } catch (error) {
          return;
        }
        const held = systemCoins.filter(coin => prelaunch.has(coin.currency_id));
        if (held.length === 0) return;

        const [height, preconversions, names] = await Promise.all([
          getChainHeight(systemId).catch(() => null),
          getOwnPreconversions(
            systemId,
            held.flatMap(coin => cardAddresses(cards?.[coin.id], systemId)),
            new Map(held.map(coin => [coin.currency_id, prelaunch.get(coin.currency_id)])),
          ).catch(() => null),
          Promise.all(
            held.map(coin =>
              getCurrencyNames(systemId, coin.currency_id).catch(() => ({})),
            ),
          ),
        ]);

        held.forEach((coin, index) => {
          const entry = prelaunch.get(coin.currency_id);
          const own = preconversions == null
            ? null
            : preconversions.filter(item => item.targetId === coin.currency_id);
          next.set(coin.id, {
            entry,
            facts: getLaunchFacts(
              {currencynames: names[index], ...entry.currencydefinition},
              {height, secondsPerBlock: coin.seconds_per_block},
            ),
            // null when the wallet could not read them; [] when there are none.
            preconversions: own,
            totals: own == null ? null : totalPreconverted(own),
          });
        });
      }),
    );
    return next;
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(() => {
    let active = true;
    setRefreshing(true);
    load()
      .then(next => {
        if (!active) return;
        setAssets(next);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => refresh(), [refresh, candidateKey, addressKey]),
  );

  return {assets, loaded, refresh, refreshing};
};

// One asset. `prelaunch` is null while unknown, false for a normal asset, and
// the facts object for a pre-launch asset.
export const usePrelaunchAsset = (coin, cards) => {
  const coins = useMemo(() => (coin ? [coin] : []), [coin]);
  const cardsByCoin = useMemo(
    () => (coin ? {[coin.id]: cards} : {}),
    [coin, cards],
  );
  const {assets, loaded, refresh, refreshing} = usePrelaunchAssets(
    coins,
    cardsByCoin,
  );
  const known = coin ? assets.get(coin.id) : null;
  const prelaunch = known || (loaded || peekPrelaunch(coin) === false ? false : null);

  return {prelaunch, refresh, refreshing};
};
