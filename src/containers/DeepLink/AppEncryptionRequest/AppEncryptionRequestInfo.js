import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Alert } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client";
import { Button, Divider, List, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { requestSeeds } from '../../../utils/auth/authBox';
import { DLIGHT_PRIVATE } from '../../../utils/constants/intervalConstants';
import { z_getencryptionaddress } from '../../../utils/api/channels/dlight/requests/getEncryptionAddress';
import { encryptVerusMessage } from '../../../utils/api/channels/dlight/requests/encrypt';
import { handleRedirect } from '../../../utils/deeplink/handleRedirect';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';

const AppEncryptionRequestInfo = props => {
  const { deeplinkData, cancel, coinObj, requestedBy, redirectInfo } = props;
  const [encRequest] = useState(primitives.AppEncryptionRequestDetails.fromJson(deeplinkData));
  const [loading, setLoading] = useState(false);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState(null);

  const accounts = useSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      handleApprove();
    }
  }, [signedIn, sendModalType]);

  const handleApprove = async () => {
    try {
      setLoading(true);

      if (!signedIn) {
        setWaitingForSignin(true);
        openAuthenticateUserModal(
          AUTHENTICATE_USER_SEND_MODAL,
          () => {},
          () => setWaitingForSignin(false)
        );
        return;
      }

      // Get user's seeds
      const seeds = await requestSeeds();
      const dlightSeed = seeds[DLIGHT_PRIVATE];

      if (!dlightSeed) {
        throw new Error("No dlight seed available for encryption");
      }

      // Derive encryption keys
      const encKeys = await z_getencryptionaddress(coinObj.id, {
        seed: dlightSeed,
        hdIndex: encRequest.derivationNumber.toNumber(),
        encryptionIndex: encRequest.secondaryDerivationNumber?.toNumber() || 0,
        fromId: encRequest.fromAddress?.getAddressString() || null,
        toId: encRequest.toAddress?.getAddressString() || null,
        returnSecret: true
      });

      if (encKeys.err) {
        throw new Error(encKeys.result);
      }

      // Encrypt to target z-address
      const encrypted = await encryptVerusMessage(
        coinObj.id,
        encRequest.encryptToZAddress,
        encKeys.result.secret,
        true
      );

      if (encrypted.err) {
        throw new Error(encrypted.result.message || "Encryption failed");
      }

      setEncryptedResult(encrypted.result);

      // Handle redirect if specified
      if (redirectInfo) {
        await handleRedirect(encrypted.result, redirectInfo);
        createAlert(
          'Success',
          'Encrypted seed has been sent successfully.'
        );
        cancel();
      } else {
        createAlert(
          'Encryption Complete',
          'Your encrypted seed is ready. You can copy it below.'
        );
      }

    } catch (error) {
      console.error('Encryption error:', error);
      createAlert('Error', error.message || 'Failed to encrypt seed');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEncrypted = () => {
    if (encryptedResult) {
      const encryptedData = JSON.stringify(encryptedResult, null, 2);
      copyToClipboard(encryptedData);
      createAlert('Copied', 'Encrypted data copied to clipboard');
    }
  };

  const getMainHeading = () => {
    const requester = requestedBy || 'An application';
    return `${requester} is requesting an encrypted derived seed`;
  };

  const getDerivationPath = () => {
    let path = `m/${encRequest.derivationNumber.toString()}`;
    if (encRequest.secondaryDerivationNumber) {
      path += `/${encRequest.secondaryDerivationNumber.toString()}`;
    }
    return path;
  };

  if (loading) {
    return <AnimatedActivityIndicatorBox />;
  }

  return (
    <SafeAreaView style={Styles.flexBackground}>
      <ScrollView style={Styles.fullWidth}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.centralHeader}>
            Encryption Request
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 16, color: Colors.basicButtonColor, marginBottom: 16 }}>
            {getMainHeading()}
          </Text>

          <List.Section>
            <List.Subheader>Request Details</List.Subheader>

            <List.Item
              title="Encrypt To Address"
              description={encRequest.encryptToZAddress}
              descriptionNumberOfLines={2}
              left={props => <List.Icon {...props} icon="shield-lock" />}
            />

            <Divider />

            <List.Item
              title="Derivation Path"
              description={getDerivationPath()}
              left={props => <List.Icon {...props} icon="file-tree" />}
            />

            <Divider />

            <List.Item
              title="Network"
              description={coinObj.id}
              left={props => <List.Icon {...props} icon="network" />}
            />

            {encRequest.fromAddress && (
              <>
                <Divider />
                <List.Item
                  title="From Address"
                  description={encRequest.fromAddress.getAddressString()}
                  descriptionNumberOfLines={2}
                  left={props => <List.Icon {...props} icon="account" />}
                />
              </>
            )}

            {encRequest.toAddress && (
              <>
                <Divider />
                <List.Item
                  title="To Address"
                  description={encRequest.toAddress.getAddressString()}
                  descriptionNumberOfLines={2}
                  left={props => <List.Icon {...props} icon="account-arrow-right" />}
                />
              </>
            )}

            {encRequest.requestID && (
              <>
                <Divider />
                <List.Item
                  title="Request ID"
                  description={encRequest.requestID}
                  descriptionNumberOfLines={2}
                  left={props => <List.Icon {...props} icon="identifier" />}
                />
              </>
            )}
          </List.Section>

          {encryptedResult && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, color: Colors.verusGreenColor, marginBottom: 8 }}>
                ✓ Encryption successful!
              </Text>
              <Button
                mode="outlined"
                onPress={handleCopyEncrypted}
                icon="content-copy"
                style={{ marginBottom: 8 }}
              >
                Copy Encrypted Data
              </Button>
            </View>
          )}

          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: Colors.secondaryColor, marginBottom: 16 }}>
              ⚠️ This will derive a child seed from your master seed and encrypt it to the specified z-address.
              Only approve if you trust the requesting application.
            </Text>

            {!encryptedResult && (
              <Button
                mode="contained"
                onPress={handleApprove}
                disabled={loading}
                style={{ marginBottom: 8, backgroundColor: Colors.primaryColor }}
              >
                Approve & Encrypt
              </Button>
            )}

            <Button
              mode="outlined"
              onPress={cancel}
              disabled={loading}
              style={{ borderColor: Colors.warningButtonColor }}
              textColor={Colors.warningButtonColor}
            >
              {encryptedResult ? 'Close' : 'Deny'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppEncryptionRequestInfo;