import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  CompactAddressObject,
  GenericResponse,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import Colors from '../../../globals/colors';
import { dataRequestInfoStyles as styles } from '../../../styles';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { VERUSID_NETWORK_DEFAULT } from '../../../../env/index';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { unixToDate } from '../../../utils/math';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import IdentityPickerSheet from '../AuthenticationRequestInfo/components/IdentityPickerSheet';
import {
  getMissingCredentialKeys,
  getScopedCredentials,
} from '../../../utils/deeplink/credentials/scopedCredentials';
import { buildUserDataResponse } from '../../../utils/deeplink/userData/buildUserDataResponse';

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const DetailRow = ({ title, subtitle, showBorder, icon }) => (
  <View style={[styles.detailRow, showBorder && styles.detailRowBorder]}>
    <View style={styles.detailLeft}>
      <Text style={styles.detailTitle}>{title}</Text>
      {subtitle ? <Text style={styles.detailSubtitle}>{subtitle}</Text> : null}
    </View>
    {icon ? <MaterialCommunityIcons name={icon} size={18} color="#888" /> : null}
  </View>
);

const UserDataRequestInfo = props => {
  const {
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    sigtime,
    credentialRequests = [],
    requestScope,
    cancel,
    next,
    response,
    request,
    detailIndex,
  } = props;

  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const encryptedIds = useObjectSelector(state => state.services.stored[VERUSID_SERVICE_ID]);
  const testnetOverrides = useObjectSelector(
    state => state.authentication.activeAccount?.testnetOverrides || {},
  );
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  const [linkedIds, setLinkedIds] = useState({});
  const [linkedIdsLoaded, setLinkedIdsLoaded] = useState(false);
  const [sortedIds, setSortedIds] = useState({});
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [missingCredentialKeys, setMissingCredentialKeys] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [waitingForSignin, setWaitingForSignin] = useState(false);

  const requestIsTestnet = request != null ? request.isTestnet() : false;
  const identityChain = requestIsTestnet ? 'VRSCTEST' : identityNetwork;
  const credentialKeys = useMemo(
    () => credentialRequests.map(item => item.key),
    [credentialRequests],
  );
  const requesterLabel = signerFqn || signerIdentityID || 'Requester';
  const sigDateString = sigtime ? unixToDate(sigtime) : null;

  useEffect(() => {
    const loadLinkedIds = async () => {
      try {
        const verusIdServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
        setLinkedIds(verusIdServiceData.linked_ids || {});
      } catch (_) {
        setLinkedIds({});
      } finally {
        setLinkedIdsLoaded(true);
      }
    };

    if (signedIn) {
      setLinkedIdsLoaded(false);
      loadLinkedIds();
    } else {
      setLinkedIdsLoaded(false);
    }
  }, [encryptedIds, signedIn]);

  useEffect(() => {
    const sorted = {};
    for (const chainId of Object.keys(linkedIds)) {
      sorted[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort((a, b) => {
            const nameA = linkedIds[chainId][a] || '';
            const nameB = linkedIds[chainId][b] || '';
            return nameA.localeCompare(nameB);
          })
        : [];
    }
    setSortedIds(sorted);
  }, [linkedIds]);

  useEffect(() => {
    if (!selectedIdentity && linkedIdsLoaded) {
      const chainIds = linkedIds[identityChain];
      if (chainIds && Object.keys(chainIds).length > 0) {
        const firstIAddress = Object.keys(chainIds)[0];
        setSelectedIdentity({
          chainId: identityChain,
          iAddress: firstIAddress,
          friendlyName: chainIds[firstIAddress] || firstIAddress,
        });
      }
    }
  }, [identityChain, linkedIds, linkedIdsLoaded, selectedIdentity]);

  useEffect(() => {
    if (waitingForSignin && signedIn && sendModalType == null) {
      setWaitingForSignin(false);
    }
  }, [signedIn, sendModalType, waitingForSignin]);

  useEffect(() => {
    let cancelled = false;

    const loadCredentials = async () => {
      if (!signedIn || !selectedIdentity) {
        setCredentials([]);
        setMissingCredentialKeys(credentialKeys);
        return;
      }

      setCredentialsLoading(true);
      try {
        const foundCredentials = await getScopedCredentials({
          systemID: signerSystemID,
          identityAddress: selectedIdentity.iAddress,
          scope: requestScope,
          credentialKeys,
        });

        if (!cancelled) {
          setCredentials(foundCredentials);
          setMissingCredentialKeys(getMissingCredentialKeys(credentialKeys, foundCredentials));
        }
      } catch (e) {
        if (!cancelled) {
          setCredentials([]);
          setMissingCredentialKeys(credentialKeys);
          createAlert('Credential Error', e.message || 'Unable to load credentials.');
        }
      } finally {
        if (!cancelled) setCredentialsLoading(false);
      }
    };

    loadCredentials();

    return () => {
      cancelled = true;
    };
  }, [credentialKeys, requestScope, selectedIdentity, signedIn, signerSystemID]);

  const isIdentityAllowed = (chainId) => chainId === identityChain;

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({ chainId, iAddress, friendlyName });
    setIdentitySheetVisible(false);
  };

  const handleSignin = () => {
    const allowlist = {};
    const chainIds = linkedIds[identityChain];
    if (chainIds) allowlist[identityChain] = Object.keys(chainIds);
    openAuthenticateUserModal({ [SEND_MODAL_USER_ALLOWLIST]: allowlist });
    setWaitingForSignin(true);
  };

  const handleContinue = async () => {
    if (!signedIn) {
      handleSignin();
      return;
    }

    if (!selectedIdentity) {
      setIdentitySheetVisible(true);
      return;
    }

    if (credentialsLoading) return;

    try {
      const detail = request.getDetails(detailIndex);
      const responseDetail = buildUserDataResponse({
        userDataDetail: detail.data,
        credentials,
      });

      const updatedResponse = response || new GenericResponse();
      updatedResponse.details = updatedResponse.details || [];

      if (responseDetail != null) {
        updatedResponse.details.push(responseDetail);
      }

      if (updatedResponse.details.length > 0 && updatedResponse.signature == null) {
        const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);
        if (!coinObj) throw new Error("Unsupported signing chain.");

        updatedResponse.signature = new VerifiableSignatureData({
          systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
          identityID: CompactAddressObject.fromIAddress(selectedIdentity.iAddress),
        });
        updatedResponse.setSigned();
      }

      next(updatedResponse, [detailIndex]);
    } catch (e) {
      createAlert('Error', e.message || 'Failed to build credential response.');
    }
  };

  const continueDisabled = credentialsLoading || waitingForSignin;

  if (credentialsLoading && credentials.length === 0) {
    return <AnimatedActivityIndicatorBox />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <IdentityPickerSheet
        visible={identitySheetVisible}
        linkedIds={linkedIds}
        sortedIds={sortedIds}
        isIdentityAllowed={isIdentityAllowed}
        selectedIdentity={selectedIdentity}
        onClose={() => setIdentitySheetVisible(false)}
        onSelect={handleSelectIdentity}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="card-account-details-outline" size={48} color={Colors.primaryColor} />
          <Text style={styles.headerTitle}>Credential Request</Text>
          <Text style={styles.headerSubtitle}>
            {requesterLabel} is requesting credential data from your identity.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requested Credentials</Text>
          </View>
          {credentialRequests.map((item, index) => (
            <DetailRow
              key={item.key}
              title={item.label}
              subtitle={item.key}
              showBorder={index > 0}
            />
          ))}
        </View>

        {missingCredentialKeys.length > 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              {missingCredentialKeys.length} requested credential{missingCredentialKeys.length === 1 ? '' : 's'} will not be returned.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Credentials Found</Text>
          </View>
          {credentials.length === 0 ? (
            <Text style={styles.emptyText}>No matching credentials were found for this scope.</Text>
          ) : (
            credentials.map((credential, index) => (
              <DetailRow
                key={`${credential.credentialKey}-${index}`}
                title={credential.label || 'Credential'}
                subtitle={credential.credentialKey}
                showBorder={index > 0}
                icon="check-circle-outline"
              />
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requester</Text>
          </View>
          <DetailRow title={requesterLabel} subtitle={signerIdentityID} />
          <DetailRow
            title={signerSystemName || signerSystemID}
            subtitle={sigDateString ? `Signed ${sigDateString}` : 'Signed request'}
            showBorder
          />
          <DetailRow title="Scope" subtitle={requestScope} showBorder />
        </View>

        <TouchableOpacity
          style={[
            styles.identitySelectCard,
            selectedIdentity && styles.identitySelectCardSelected,
          ]}
          onPress={() => signedIn ? setIdentitySheetVisible(true) : handleSignin()}
          activeOpacity={0.7}
        >
          <View style={styles.identitySelectIconContainer}>
            <MaterialCommunityIcons
              name={selectedIdentity ? 'account-check' : 'account-question'}
              size={28}
              color={selectedIdentity ? Colors.verusGreenColor : Colors.primaryColor}
            />
          </View>
          <View style={styles.identitySelectTextContainer}>
            <Text style={styles.identitySelectLabel}>Respond With</Text>
            <Text
              style={[
                styles.identitySelectName,
                selectedIdentity && styles.identitySelectNameSelected,
              ]}
              numberOfLines={1}
            >
              {selectedIdentity ? selectedIdentity.friendlyName : 'Select identity'}
            </Text>
            {selectedIdentity ? (
              <Text style={styles.identitySelectAddress}>
                {truncateAddress(selectedIdentity.iAddress)}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#AAA" />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.ctaCol}>
          <Button
            mode="contained"
            onPress={cancel}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            labelStyle={styles.secondaryCtaLabel}
          >
            Deny
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={continueDisabled}
            style={styles.primaryCta}
            contentStyle={styles.primaryCtaContent}
            labelStyle={styles.primaryCtaLabel}
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default UserDataRequestInfo;
