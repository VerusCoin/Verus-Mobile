import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import Styles from '../../../styles/index';
import { Button, Divider, List, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { handleRedirect } from '../../../utils/deeplink/handleRedirect';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import { 
  handleAppEncryptionRequest,
  parseAppEncryptionRequest,
  getRequestDisplayInfo
} from './appEncryptionHandler';

const AppEncryptionRequestInfo = props => {
  const { 
    deeplinkData, 
    cancel, 
    coinObj, 
    displayInfo,
    redirectUri,
    passthrough,
    activeAccount,
    requestSignerID,
    appOrDelegatedID,
    responseSignerID
  } = props;

  const [encRequest] = useState(parseAppEncryptionRequest(deeplinkData));
  const [loading, setLoading] = useState(false);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState(null);

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

      // response array to collect results
      const response = [];

      // call our handler
      const result = await handleAppEncryptionRequest({
        request: encRequest,
        requestIndex: 0,
        systemID: coinObj.system_id || coinObj.id,
        requestSignerID,
        appOrDelegatedID,
        response,
        responseSignerID,
        activeAccount
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const encryptedData = response[0]?.encryptedData;
      setEncryptedResult(encryptedData);

      // handle redirect if specified
      if (redirectUri) {
        await handleRedirect(encryptedData, { uri: redirectUri, passthrough });
        createAlert('Success', 'Encrypted response has been sent successfully.');
        cancel();
      } else {
        createAlert('Encryption Complete', 'Your encrypted response is ready.');
      }

    } catch (error) {
      console.error('Encryption error:', error);
      createAlert('Error', error.message || 'Failed to process encryption request');
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
    const appName = displayInfo?.appOrDelegatedID || 'An application';
    return `${appName} is requesting encryption keys`;
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
              title="Requesting App"
              description={displayInfo?.appOrDelegatedID || 'Unknown'}
              left={props => <List.Icon {...props} icon="application" />}
            />

            <Divider />

            <List.Item
              title="Your Identity"
              description={responseSignerID || 'Not specified'}
              left={props => <List.Icon {...props} icon="account" />}
            />

            <Divider />

            <List.Item
              title="Network"
              description={coinObj.display_ticker || coinObj.id}
              left={props => <List.Icon {...props} icon="network" />}
            />

            <Divider />

            <List.Item
              title="Derivation Number"
              description={displayInfo?.derivationNumber?.toString() || '0'}
              left={props => <List.Icon {...props} icon="file-tree" />}
            />

            {displayInfo?.requestsSpendingKey && (
              <>
                <Divider />
                <List.Item
                  title="Spending Key Requested"
                  description="This app is requesting spending key access"
                  left={props => <List.Icon {...props} icon="alert" color={Colors.warningButtonColor} />}
                  descriptionStyle={{ color: Colors.warningButtonColor }}
                />
              </>
            )}
          </List.Section>

          {displayInfo?.warning && (
            <View style={{ 
              backgroundColor: Colors.warningButtonColor + '20',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Text style={{ color: Colors.warningButtonColor, fontSize: 14 }}>
                ⚠️ {displayInfo.warning}
              </Text>
            </View>
          )}

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
              This will create encrypted channel keys between your identity and the requesting app.
              Only approve if you trust this application.
            </Text>

            {!encryptedResult && (
              <Button
                mode="contained"
                onPress={handleApprove}
                disabled={loading}
                style={{ marginBottom: 8, backgroundColor: Colors.primaryColor }}
              >
                Approve
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