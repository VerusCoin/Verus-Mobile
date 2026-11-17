import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {
  closeSendModal,
  openRecoverIdentitySendModal,
  openRevokeIdentitySendModal,
} from '../../actions/actions/sendModal/dispatchers/sendModal';
import AppButton from '../../components/AppButton';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import {
  getAccountNetworkKey,
  WALLET_NETWORKS,
} from '../../utils/account/accountNetwork';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
  SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
  SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
  SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
  SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
  SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
  SEND_MODAL_REVOKE_RECOVER_COMPLETE,
  SEND_MODAL_SYSTEM_ID,
} from '../../utils/constants/sendModal';
import {encryptkey} from '../../utils/seedCrypt';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from './RevokeRecoverFlowScaffold';

const DEFAULT_SYSTEMS = [
  coinsList.VRSC,
  coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2,
  coinsList.iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP,
  coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N,
  coinsList.VRSCTEST,
];

const RevokeRecoverIdentityForm = ({
  navigation,
  isRecovery,
  importedSeed,
  initialNetworkKey,
  exitRevokeRecover,
}) => {
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const complete = useSelector(
    state => state.sendModal.data[SEND_MODAL_REVOKE_RECOVER_COMPLETE],
  );
  const sendModalVisible = useSelector(state => state.sendModal.visible);
  const theme = useAppTheme();
  const selectedColor = theme.isDark
    ? theme.colors.textPrimary
    : theme.colors.primary;
  const hasExplicitNetwork =
    initialNetworkKey === WALLET_NETWORKS.MAINNET ||
    initialNetworkKey === WALLET_NETWORKS.TESTNET;
  const resolvedInitialNetworkKey = hasExplicitNetwork
    ? initialNetworkKey
    : activeAccount != null
    ? getAccountNetworkKey(activeAccount)
    : WALLET_NETWORKS.MAINNET;
  const initialNetwork =
    resolvedInitialNetworkKey === WALLET_NETWORKS.TESTNET
      ? coinsList.VRSCTEST
      : coinsList.VRSC;
  const [selectedNetwork, setSelectedNetwork] = useState(initialNetwork);
  const [loading, setLoading] = useState(false);
  const [prepareError, setPrepareError] = useState(null);
  const openedModal = useRef(false);

  const systems = useMemo(
    () => DEFAULT_SYSTEMS.filter(system =>
      Boolean(system.testnet) ===
        (resolvedInitialNetworkKey === WALLET_NETWORKS.TESTNET),
    ),
    [resolvedInitialNetworkKey],
  );

  useEffect(() => {
    if (sendModalVisible) {
      openedModal.current = true;
      return;
    }

    if (openedModal.current && complete) {
      openedModal.current = false;
      closeSendModal();
      exitRevokeRecover();
    }
  }, [complete, exitRevokeRecover, sendModalVisible]);

  const continueFlow = async () => {
    if (loading || !importedSeed) return;

    setPrepareError(null);
    setLoading(true);

    try {
      const encryptedSeed = await encryptkey(instanceKey, importedSeed);
      const sharedData = {
        [SEND_MODAL_SYSTEM_ID]: selectedNetwork.system_id,
        [SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: encryptedSeed,
        [SEND_MODAL_REVOKE_RECOVER_COMPLETE]: false,
      };

      if (isRecovery) {
        openRecoverIdentitySendModal({
          ...sharedData,
          [SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]: '',
          [SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]: '',
          [SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY]: false,
          [SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD]: '',
          [SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD]: '',
          [SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS]: false,
          [SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD]: '',
        });
      } else {
        openRevokeIdentitySendModal({
          ...sharedData,
          [SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: '',
        });
      }
    } catch (_) {
      setPrepareError(
        'The imported authority key could not be secured for this session. Go back, import it again, and retry.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton
          disabled={loading || !importedSeed}
          loading={loading}
          onPress={continueFlow}
          testID="revokeRecover.network.continue">
          {loading ? 'Preparing secure session...' : 'Continue'}
        </AppButton>
      }
      headerTitle="Choose blockchain"
      onBack={() => navigation.goBack()}
      progress={0.5}>
      <RevokeRecoverStepCopy body="Choose the blockchain where this VerusID exists." />

      <View accessibilityRole="radiogroup" style={styles.networkList}>
        {systems.map(system => {
          const selected = selectedNetwork.id === system.id;

          return (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityState={{checked: selected}}
              activeOpacity={0.76}
              key={system.id}
              onPress={() => setSelectedNetwork(system)}
              style={[
                styles.networkRow,
                {
                  backgroundColor: selected
                    ? theme.colors.surfaceMuted
                    : theme.colors.background,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              testID={`revokeRecover.network.${system.id}`}>
              <View style={styles.networkCopy}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.networkName,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {system.display_name}
                </Text>
                <Text
                  style={[
                    styles.networkTicker,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {system.display_ticker}
                  {system.id === coinsList.VRSCTEST.id ? ' · Testnet' : ''}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={selected ? selectedColor : theme.colors.textSubtle}
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={23}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {prepareError ? (
        <View
          style={[
            styles.notice,
            {backgroundColor: theme.colors.dangerBackground},
          ]}>
          <MaterialCommunityIcons
            color={theme.colors.danger}
            name="alert-circle-outline"
            size={21}
          />
          <Text
            style={[styles.noticeCopy, {color: theme.colors.textSecondary}]}>
            {prepareError}
          </Text>
        </View>
      ) : null}

      <Text
        style={[
          theme.typography.caption,
          {color: theme.colors.textSecondary, marginTop: 24},
        ]}>
        Exported identities need a separate action on each blockchain.
      </Text>
    </RevokeRecoverFlowScaffold>
  );
};

export default RevokeRecoverIdentityForm;
