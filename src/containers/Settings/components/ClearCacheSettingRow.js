import React, {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {clearCacheData} from '../../../actions/actionCreators';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

const ClearCacheSettingRow = ({last = false, navigation}) => {
  const dispatch = useDispatch();

  const canClearCache = useCallback(
    () =>
      createAlert(
        'Clear the data cache?',
        'The wallet resyncs and can be slow for a while. Wallets and recovery secrets are not deleted.',
        [
          {
            text: 'Not now',
            onPress: () => resolveAlert(false),
            style: 'cancel',
          },
          {text: 'Clear cache', onPress: () => resolveAlert(true)},
        ],
      ),
    [],
  );

  const clearCache = useCallback(() => {
    canClearCache().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: () => clearCacheData(dispatch),
          message: 'Clearing cache',
          route: 'Home',
          successMsg: 'Cache cleared successfully',
          errorMsg: 'Cache failed to clear',
        });
      }
    });
  }, [canClearCache, dispatch, navigation]);

  return (
    <SettingsRow
      description="Wallet data will resync"
      icon="database-refresh"
      last={last}
      onPress={clearCache}
      showChevron={false}
      title="Clear cache"
    />
  );
};

export default ClearCacheSettingRow;
