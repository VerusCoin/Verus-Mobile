import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Checkbox, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {GenericResponse} from 'verus-typescript-primitives';
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
import { buildDataPacketResponse } from '../../../utils/deeplink/dataPacket/signDataPacket';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {getMatchingRequestAccounts} from '../../../utils/deeplink/requestAccounts';

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

const formatHex = value => {
  if (!value) return '';
  return value.match(/.{1,64}/g)?.join('\n') || value;
};

const ReviewCheckbox = ({ checked, onPress, title, subtitle, showBorder }) => (
  <TouchableOpacity
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    activeOpacity={0.75}
    onPress={onPress}
    style={[styles.reviewCheckRow, showBorder && styles.detailRowBorder]}
  >
    <View pointerEvents="none">
      <Checkbox.Android
        status={checked ? 'checked' : 'unchecked'}
        color={Colors.verusGreenColor}
        uncheckedColor="#888"
      />
    </View>
    <View style={styles.reviewCheckTextContainer}>
      <Text style={styles.reviewCheckTitle}>{title}</Text>
      {subtitle ? <Text style={styles.reviewCheckSubtitle}>{subtitle}</Text> : null}
    </View>
  </TouchableOpacity>
);

const PayloadField = ({ label, value, monospace }) => {
  if (value == null || value === '') return null;

  return (
    <View style={styles.payloadField}>
      <Text style={styles.payloadLabel}>{label}</Text>
      <Text style={monospace ? styles.payloadCodeText : styles.payloadText}>
        {value}
      </Text>
    </View>
  );
};

const SignableObjectReview = ({ item, index, checked, onToggle, showBorder }) => (
  <View style={[styles.signableItem, showBorder && styles.detailRowBorder]}>
    <View style={styles.signableHeader}>
      <View style={styles.detailLeft}>
        <Text style={styles.detailTitle}>{item.type}</Text>
        <Text style={styles.detailSubtitle}>
          {item.label}{item.size != null ? ` - ${item.size} bytes` : ''}
        </Text>
      </View>
      <MaterialCommunityIcons name="signature-freehand" size={18} color="#888" />
    </View>

    <PayloadField label="SHA-256 hash being signed" value={item.sha256} monospace />
    <PayloadField label="Text being signed" value={item.signedText} />
    <PayloadField label="JSON being signed" value={item.signedJson} monospace />
    <PayloadField label="Signed bytes" value={formatHex(item.signedBytesHex)} monospace />

    {item.descriptorVersion != null ? (
      <View style={styles.payloadMetaGrid}>
        <PayloadField label="Descriptor version" value={item.descriptorVersion} />
        <PayloadField label="Descriptor flags" value={item.descriptorFlags} />
        <PayloadField label="Descriptor label" value={item.descriptorLabel} />
        <PayloadField label="Descriptor MIME type" value={item.descriptorMimeType} />
      </View>
    ) : null}
    <PayloadField label="Descriptor object text" value={item.objectDataText} />
    <PayloadField label="Descriptor object JSON" value={item.objectDataJson} monospace />
    <PayloadField label="Descriptor object bytes" value={formatHex(item.objectDataBytesHex)} monospace />
    <PayloadField label="Descriptor JSON" value={item.descriptorJson} monospace />

    <ReviewCheckbox
      checked={checked}
      onPress={onToggle}
      title={`I reviewed data item ${index + 1} and agree to sign it`}
      showBorder
    />
  </View>
);

const DataPacketRequestInfo = props => {
  const {
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    sigtime,
    statements = [],
    signableObjectSummaries = [],
    cancel,
    next,
    response,
    request,
    detailIndex,
  } = props;

  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const accounts = useObjectSelector(state => state.authentication.accounts);
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
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [signing, setSigning] = useState(false);
  const [acknowledgedStatements, setAcknowledgedStatements] = useState({});
  const [acknowledgedSignableObjects, setAcknowledgedSignableObjects] = useState({});

  const requestIsTestnet = request != null ? request.isTestnet() : false;
  const identityChain = requestIsTestnet ? 'VRSCTEST' : identityNetwork;
  const matchingAccounts = useMemo(
    () => getMatchingRequestAccounts(accounts, requestIsTestnet),
    [accounts, requestIsTestnet],
  );
  const requesterLabel = signerFqn || signerIdentityID || 'Requester';
  const sigDateString = sigtime ? unixToDate(sigtime) : null;
  const statementsReviewed = useMemo(
    () => !statements.length || statements.every((_, index) => acknowledgedStatements[index]),
    [acknowledgedStatements, statements],
  );
  const signableObjectsReviewed = useMemo(
    () => signableObjectSummaries.length > 0 &&
      signableObjectSummaries.every((_, index) => acknowledgedSignableObjects[index]),
    [acknowledgedSignableObjects, signableObjectSummaries],
  );
  const reviewComplete = statementsReviewed && signableObjectsReviewed;

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

  const isIdentityAllowed = chainId => chainId === identityChain;

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({ chainId, iAddress, friendlyName });
    setIdentitySheetVisible(false);
  };

  const handleSignin = () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No profile found',
        `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profile is available for this request.`,
      );
      return;
    }

    openAuthenticateUserModal({
      [SEND_MODAL_USER_ALLOWLIST]: matchingAccounts,
    });
    setWaitingForSignin(true);
  };

  const toggleStatementAcknowledgement = index => {
    setAcknowledgedStatements(current => ({
      ...current,
      [index]: !current[index],
    }));
  };

  const toggleSignableObjectAcknowledgement = index => {
    setAcknowledgedSignableObjects(current => ({
      ...current,
      [index]: !current[index],
    }));
  };

  const handleContinue = async () => {
    if (!reviewComplete) {
      createAlert('Review required', 'Review and agree to every statement and data item before continuing.');
      return;
    }

    if (!signedIn) {
      handleSignin();
      return;
    }

    if (!selectedIdentity) {
      setIdentitySheetVisible(true);
      return;
    }

    setSigning(true);

    try {
      const detail = request.getDetails(detailIndex);
      const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);
      if (!coinObj) throw new Error("Unsupported signing chain.");

      const updatedResponse = response || new GenericResponse();
      ensureGenericResponseSigner({
        response: updatedResponse,
        systemID: coinObj.system_id,
        identityID: selectedIdentity.iAddress,
      });

      const responseDetail = await buildDataPacketResponse({
        coinObj,
        identityAddress: selectedIdentity.iAddress,
        dataPacketDetail: detail.data,
      });

      updatedResponse.details = updatedResponse.details || [];
      updatedResponse.details.push(responseDetail);

      updatedResponse.setFlags();

      next(updatedResponse, [detailIndex]);
    } catch (e) {
      createAlert('Error', e.message || 'Failed to sign data packet.');
      setSigning(false);
    }
  };

  if (signing) {
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
          <MaterialCommunityIcons name="text-box-check-outline" size={48} color={Colors.primaryColor} />
          <Text style={styles.headerTitle}>Data Signature Request</Text>
          <Text style={styles.headerSubtitle}>
            {requesterLabel} is requesting signatures over data shown below.
          </Text>
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
            <Text style={styles.identitySelectLabel}>Sign With</Text>
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

        {statements && statements.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Statements to Sign</Text>
            </View>
            {statements.map((statement, index) => (
              <ReviewCheckbox
                key={`${statement}-${index}`}
                checked={!!acknowledgedStatements[index]}
                onPress={() => toggleStatementAcknowledgement(index)}
                title={`Statement ${index + 1}`}
                subtitle={statement}
                showBorder={index > 0}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data to Sign</Text>
          </View>
          {signableObjectSummaries.map((item, index) => (
            <SignableObjectReview
              key={`${item.type}-${index}`}
              item={item}
              index={index}
              checked={!!acknowledgedSignableObjects[index]}
              onToggle={() => toggleSignableObjectAcknowledgement(index)}
              showBorder={index > 0}
            />
          ))}
        </View>
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
            disabled={waitingForSignin || !reviewComplete}
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

export default DataPacketRequestInfo;
