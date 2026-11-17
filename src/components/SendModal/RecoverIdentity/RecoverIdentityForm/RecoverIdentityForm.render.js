import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ChevronDown, ChevronUp} from 'lucide-react-native';
import AppButton from '../../../AppButton';
import TextAction from '../../../TextAction';
import ScannerScreen from '../../../BarcodeReader/ScannerScreen';
import RevokeRecoverFlowScaffold from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import RevokeRecoverIdentityPickerSheet, {
  RevokeRecoverIdentityField,
} from '../../../../containers/RevokeRecover/RevokeRecoverIdentityPickerSheet';
import {RevokeRecoverLoadingState} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';
import RecoveryChangeSheet from '../../../../containers/RevokeRecover/RecoveryChangeSheet';
import {useAppTheme} from '../../../../theme/app';
import {
  SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
  SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
  SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
  SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
  SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
} from '../../../../utils/constants/sendModal';

const shortAddress = value =>
  value && value.length > 24
    ? `${value.slice(0, 10)}…${value.slice(-8)}`
    : value;

export const RecoverIdentityFormRender = ({
  chooseCandidate,
  chooseManualEntry,
  formError,
  handleScan,
  identityDiscovery,
  identitySheetVisible,
  loading,
  manualEntry,
  networkName,
  onBack,
  onCloseIdentitySheet,
  onOpenIdentitySheet,
  scannerOpen,
  selectedCandidate,
  sendModalData,
  submitData,
  toggleScanner,
  updateIdentity,
  currentIdentity,
  editSheet,
  editSheetVisible,
  editOptions,
  draft = {},
  editError,
  openEditSheet,
  onCloseEditSheet,
  onEditClosed,
  onEditChange,
  onSaveEdit,
  onResetEdit,
}) => {
  const theme = useAppTheme();
  const [advanced, setAdvanced] = useState(
    () =>
      !!(
        sendModalData[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] ||
        sendModalData[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS]
      ),
  );
  const changeAuthorities =
    sendModalData[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] === true;
  const changePrivateAddress =
    sendModalData[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] === true;
  const primary = sendModalData[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD];
  const zAddress = changePrivateAddress
    ? sendModalData[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD]
    : currentIdentity?.privateaddress;
  const recovery =
    (changeAuthorities &&
      sendModalData[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD]) ||
    currentIdentity?.recoveryauthority;
  const revocation =
    (changeAuthorities &&
      sendModalData[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD]) ||
    currentIdentity?.revocationauthority;

  if (scannerOpen)
    return (
      <ScannerScreen
        borderless
        noCameraAction={{label: 'Enter address', onPress: toggleScanner}}
        noCameraHint="Paste or type the address instead."
        onBack={toggleScanner}
        onScan={handleScan}
        progress={0.68}
        title="Scan address"
      />
    );

  if (loading)
    return (
      <RevokeRecoverFlowScaffold
        backDisabled
        showBack={false}
        headerTitle="Checking recovery"
        keyboardAvoiding={false}
        progress={0.68}>
        <RevokeRecoverLoadingState body="Checking the identity, authority, and addresses." />
      </RevokeRecoverFlowScaffold>
    );

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton
          disabled={
            !sendModalData[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]?.trim()
          }
          onPress={submitData}
          testID="revokeRecover.identity.review">
          Review recovery
        </AppButton>
      }
      headerTitle="Recovery details"
      onBack={onBack}
      progress={0.68}
      overlayVisible={identitySheetVisible || !!editSheet}
      overlay={
        <>
          <RevokeRecoverIdentityPickerSheet
            candidates={identityDiscovery.candidates}
            isRecovery
            onClose={onCloseIdentitySheet}
            onManualEntry={chooseManualEntry}
            onRetry={identityDiscovery.retry}
            onSelect={chooseCandidate}
            selectedIdentityAddress={selectedCandidate?.identityAddress}
            status={identityDiscovery.status}
            visible={identitySheetVisible}
          />
          <RecoveryChangeSheet
            type={editSheet}
            visible={editSheetVisible}
            hasZAddress={editOptions.hasZAddress}
            current={currentIdentity}
            draft={draft}
            error={editError}
            onChange={onEditChange}
            onClose={onCloseEditSheet}
            onClosed={onEditClosed}
            onSave={onSaveEdit}
            onReset={editOptions.canReset ? onResetEdit : undefined}
            onScan={() =>
              toggleScanner(
                editSheet === 'primary'
                  ? SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD
                  : SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
              )
            }
          />
        </>
      }>
      <RevokeRecoverIdentityField
        candidateCount={identityDiscovery.candidates.length}
        discoveryStatus={identityDiscovery.status}
        contextLabel={`Recovering on ${networkName}`}
        errorText={formError}
        isRecovery
        manualEntry={manualEntry}
        networkName={networkName}
        onChangeText={updateIdentity}
        onChoose={onOpenIdentitySheet}
        onRetry={identityDiscovery.retry}
        selectedCandidate={selectedCandidate}
        value={sendModalData[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD] || ''}
      />
      <View style={localStyles.primary}>
        <EditRow
          title="Primary R-address"
          value={
            primary
              ? `New · ${shortAddress(primary)}`
              : currentIdentity?.primaryaddresses?.length
              ? `Current · ${currentIdentity.primaryaddresses
                  .map(shortAddress)
                  .join(', ')}`
              : 'Current address will be kept'
          }
          onPress={() => openEditSheet('primary')}
          testID="revokeRecover.primary.change"
        />
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{expanded: advanced}}
        onPress={() => setAdvanced(!advanced)}
        style={localStyles.row}
        testID="revokeRecover.advanced">
        <View style={localStyles.copy}>
          <Text
            style={[
              theme.typography.bodyMd,
              {color: theme.colors.textPrimary},
            ]}>
            Advanced changes
          </Text>
          <Text
            style={[
              theme.typography.caption,
              {color: theme.colors.textSecondary},
            ]}>
            Authorities and Z-address
          </Text>
        </View>
        {advanced ? (
          <ChevronUp color={theme.colors.textSubtle} size={22} />
        ) : (
          <ChevronDown color={theme.colors.textSubtle} size={22} />
        )}
      </TouchableOpacity>
      {advanced ? (
        <>
          <EditRow
            title="Authorities"
            value={
              changeAuthorities
                ? `Recovery · ${
                    recovery || 'Current authority'
                  }\nRevocation · ${revocation || 'Current authority'}`
                : 'Recovery and revocation authorities'
            }
            onPress={() => openEditSheet('authorities')}
            testID="revokeRecover.authorities.change"
          />
          <EditRow
            title="Z-address"
            value={
              shortAddress(zAddress) ||
              (currentIdentity ? 'Not set' : 'Current value not loaded')
            }
            action={zAddress ? 'Change' : currentIdentity ? 'Add' : 'Change'}
            onPress={() => openEditSheet('zAddress')}
            testID="revokeRecover.zAddress.change"
          />
        </>
      ) : null}
    </RevokeRecoverFlowScaffold>
  );
};

const EditRow = ({title, value, action = 'Change', onPress, testID}) => {
  const theme = useAppTheme();
  return (
    <View style={localStyles.row}>
      <View style={localStyles.copy}>
        <Text
          style={[theme.typography.bodyMd, {color: theme.colors.textPrimary}]}>
          {title}
        </Text>
        <Text
          style={[
            theme.typography.caption,
            {color: theme.colors.textSecondary},
          ]}>
          {value}
        </Text>
      </View>
      <TextAction
        accessibilityLabel={`${action} ${title}`}
        onPress={onPress}
        testID={testID}
        style={localStyles.action}>
        {action}
      </TextAction>
    </View>
  );
};
const localStyles = StyleSheet.create({
  primary: {marginTop: 24, marginBottom: 12},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingVertical: 12,
  },
  copy: {flex: 1, minWidth: 0, gap: 3, paddingRight: 14},
  action: {
    minWidth: 62,
    minHeight: 44,
    alignSelf: 'center',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
