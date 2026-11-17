import {useCallback, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {saveGeneralSettings} from '../actions/actions/WalletSettings';
import {
  getWalletNetworkKey,
  WALLET_NETWORKS,
} from '../utils/account/accountNetwork';

// Settings finish loading before either signed-out stack mounts.
const useSignedOutNetwork = () => {
  const lastWalletNetwork = useSelector(
    state => state.settings.generalWalletSettings.lastWalletNetwork,
  );
  const dispatch = useDispatch();
  const [testProfile, setTestProfileState] = useState(
    () => lastWalletNetwork === WALLET_NETWORKS.TESTNET,
  );

  const setTestProfile = useCallback(
    nextTestProfile => {
      const isTestnet = nextTestProfile === true;
      setTestProfileState(isTestnet);

      // A preference save must not block access to wallets on this network.
      saveGeneralSettings({lastWalletNetwork: getWalletNetworkKey(isTestnet)})
        .then(action => dispatch(action))
        .catch(() => console.warn('Failed to save wallet network choice.'));
    },
    [dispatch],
  );

  return [testProfile, setTestProfile];
};

export default useSignedOutNetwork;
