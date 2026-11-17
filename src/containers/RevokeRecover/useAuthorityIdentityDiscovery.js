import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AUTHORITY_IDENTITY_DISCOVERY_STATUS,
  discoverAuthorityIdentityTargets,
} from '../../utils/api/channels/verusid/authorityIdentityDiscovery';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {ELECTRUM} from '../../utils/constants/intervalConstants';
import {deriveKeyPair} from '../../utils/keys';
import {decryptkey} from '../../utils/seedCrypt';

const INITIAL_STATE = {
  candidates: [],
  status: AUTHORITY_IDENTITY_DISCOVERY_STATUS.LOADING,
};

const useAuthorityIdentityDiscovery = ({
  active,
  encryptedSeed,
  instanceKey,
  isRecovery,
  systemId,
}) => {
  const requestIdRef = useRef(0);
  const [discovery, setDiscovery] = useState(INITIAL_STATE);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey(current => current + 1);
  }, []);

  useEffect(() => {
    if (!active) {
      requestIdRef.current += 1;
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const discover = async () => {
      setDiscovery(INITIAL_STATE);

      try {
        const seed = decryptkey(instanceKey, encryptedSeed);
        if (!seed) throw new Error('Unable to decrypt authority key');

        const system = CoinDirectory.findSystemCoinObj(systemId);
        const keyPair = await deriveKeyPair(seed, system, ELECTRUM);
        const primaryAddress = keyPair.addresses?.[0];
        if (!primaryAddress) throw new Error('Unable to derive authority address');

        const result = await discoverAuthorityIdentityTargets({
          isRecovery,
          primaryAddress,
          systemId,
        });

        if (requestIdRef.current === requestId) {
          setDiscovery(result);
        }
      } catch (_) {
        if (requestIdRef.current === requestId) {
          setDiscovery({
            candidates: [],
            status: AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR,
          });
        }
      }
    };

    discover();

    return () => {
      requestIdRef.current += 1;
    };
  }, [
    active,
    encryptedSeed,
    instanceKey,
    isRecovery,
    retryKey,
    systemId,
  ]);

  return {...discovery, retry};
};

export default useAuthorityIdentityDiscovery;
