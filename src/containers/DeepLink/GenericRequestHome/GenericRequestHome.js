/*
  GenericRequestHome 
  - Coordinates generic request detail handlers, chooses the matching deeplink
    screen, and forwards completed responses through the request flow.
*/
import React, {useState, useEffect} from 'react';
import {Linking, TouchableOpacity, View} from 'react-native';
import { Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import {
  AUTHENTICATION_REQUEST_VDXF_KEY,
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DEEPLINK_PROTOCOL_URL_STRING,
  GenericRequest,
  GenericResponse,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY,
  VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY,
} from 'verus-typescript-primitives';
import InvoiceInfo from '../InvoiceInfo/InvoiceInfo';
import { handleVerusPayInvoiceDetailsVDXFObject } from '../../../utils/deeplink/handlers/verusPayInvoiceDetailsHandler';
import { handleAuthenticationRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/authenticationRequestDetailsHandler';
import { handleIdentityUpdateRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/identityUpdateRequestDetailsHandler';
import { handleProvisionIdentityDetailsVDXFObject } from '../../../utils/deeplink/handlers/provisionIdentityDetailsHandler';
import { handleAppEncryptionRequestVDXFObject } from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import { handleCreateWalletBackupDetailsVDXFObject } from '../../../utils/deeplink/handlers/createWalletBackupDetailsHandler';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import AuthenticationRequestInfo from '../AuthenticationRequestInfo/AuthenticationRequestInfo';
import IdentityUpdateRequestInfo from '../IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';
import AppEncryptionRequestInfo from '../AppEncryptionRequestInfo/AppEncryptionRequestInfo';
import WalletBackupRequestInfo from '../WalletBackupRequestInfo/WalletBackupRequestInfo';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { isDeeplinkHandlerInstalled } from '../../../utils/deeplink/isDeeplinkHandlerInstalled';
import Colors from '../../../globals/colors';


const GenericRequestHome = props => {
  const {
    deeplinkData
  } = props;

  /**
   * @type {[GenericRequest, (GenericRequest) => {}]}
   */
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(new primitives.GenericResponse());

  const [displayProps, setDisplayProps] = useState({});

  const [displayKey, setDisplayKey] = useState(null);

  const [detailIndex, setDetailIndex] = useState(0);

  const [valuInstalled, setValuInstalled] = useState(false);
  const [openInAnotherAppVisible, setOpenInAnotherAppVisible] = useState(false);

  /**
   * @type {[number, (number) => {}]}
   */
  const [detailsProcessed, setDetailsProcessed] = useState(-1);

  /**
   * @type {[Array<number>, (Array<number>) => {}]}
   */
  const [processedDetailIndices, setProcessedDetailIndices] = useState([]);

  /**
   * @type {Map<string, (GenericRequest, GenericResponse, number) => Promise<{
   *  displayProps?: { [key: string]: any };
   *  response: GenericResponse;
   *  handledIndices: Array<number>;
   * }>}
   */
  const detailHandlers = new Map();

  detailHandlers.set(VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid, handleVerusPayInvoiceDetailsVDXFObject);
  detailHandlers.set(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid, handleAuthenticationRequestDetailsVDXFObject);
  detailHandlers.set(IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid, handleIdentityUpdateRequestDetailsVDXFObject);
  detailHandlers.set(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid, handleProvisionIdentityDetailsVDXFObject);
  detailHandlers.set(APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid, handleAppEncryptionRequestVDXFObject);
  detailHandlers.set(CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid, handleCreateWalletBackupDetailsVDXFObject);
  /**
   * Processes a detail in the request at a certain index
   * @param {number} index 
   */
  const processDetailAtIndex = async (index) => {
    const detail = request.getDetails(index);

    if (detail) {
      const iaddr = detail.getIAddressKey();

      if (detailHandlers.has(iaddr)) {
        setDetailIndex(index);
        return await detailHandlers.get(iaddr)(request, response, index);
      }
    } else throw new Error("Unable to find detail at index " + index);
  }

  const processNextDetail = async () => {
    const detailsLen = request.details.length;
    const numProcessed = processedDetailIndices.length;

    if (numProcessed < detailsLen) {
      for (let i = 0; i < request.details.length; i++) {
        if (!processedDetailIndices.includes(i)) {
          try {
            const res = await processDetailAtIndex(i);
            const newIndices = [...processedDetailIndices];

            for (const processedIndex of res.handledIndices) {
              if (!processedDetailIndices.includes(processedIndex)) {
                newIndices.push(processedIndex);
              }
            }

            setResponse(res.response);
            setProcessedDetailIndices(newIndices);

            if (res.displayProps) {
              setDisplayProps(res.displayProps)
              setDisplayKey(request.getDetails(i).getIAddressKey());
            } else {
              let newDetailsProcessed = detailsProcessed;

              for (const handledIndex of res.handledIndices) {
                if (!processedDetailIndices.includes(handledIndex)) {
                  newDetailsProcessed++;
                }
              }

              setDetailsProcessed(newDetailsProcessed)
            }

            return;
          } catch (e) {
            createAlert("Error", e.message)
            props.cancel()
            console.warn(e)
          }
        }
      }
    }
  }

  /**
   * Function passed to GUI elements that allows them to update handled
   * indices and response when done
   * @param {GenericResponse} response 
   * @param {Array<number>} handledIndices
   */
  const next = async (response, handledIndices) => {
    let newDetailsProcessed = detailsProcessed;

    for (const handledIndex of handledIndices) {
      if (!processedDetailIndices.includes(handledIndex)) {
        newDetailsProcessed++;
      }
    }

    if (request && newDetailsProcessed < request.details.length) {
      props.navigation.popToTop();
    }

    setResponse(response);
    setProcessedDetailIndices([...processedDetailIndices, ...handledIndices]);
    setDetailsProcessed(newDetailsProcessed);
  }

  useEffect(() => {
    isDeeplinkHandlerInstalled(VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID).then(installed => {
      setValuInstalled(installed);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Do not update after initial update
    if (request == null) {
      const req = new primitives.GenericRequest();
      req.fromBuffer(Buffer.from(deeplinkData, 'hex'));

      setRequest(req);
      setDetailsProcessed(0);
    }
  }, [deeplinkData]);

  useEffect(() => {
    if (request != null) {
      if (detailsProcessed < request.details.length && detailsProcessed >= 0) {
        setDisplayKey(null);
        setDisplayProps({});
        processNextDetail();
      } else {
        const responseBufferString = response.details && response.details.length > 0
          ? response.toBuffer().toString('hex')
          : '';
        const requestBufferString = request.toBuffer().toString('hex');

        props.navigation.navigate('GenericRequestComplete', {
          requestBufferString,
          responseBufferString
        });
      }
    }
  }, [detailsProcessed]);

  const insets = useSafeAreaInsets();

  const screens = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AuthenticationRequestInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: () => (
      <IdentityUpdateRequestInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        requestBufferString={request.toBuffer().toString('hex')}
        responseBufferString={
          response.details && response.details.length > 0
            ? response.toBuffer().toString('hex')
            : ''
        }
        detailIndex={detailIndex}
        next={next}
      />
    ),
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AppEncryptionRequestInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid]: () => (
      <WalletBackupRequestInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    )
  };

  // Keep handler selection and alternate-app routing explicit; integrated by Codex GPT-5 so new VDXF types do not bypass the redesign flow.
  const openInValu = () => {
    const originalUri = request.toWalletDeeplinkUri();
    const redirectUri = originalUri.replace(
      `${DEEPLINK_PROTOCOL_URL_STRING}://`,
      `${DEEPLINK_PROTOCOL_URL_STRING}${VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID}://`
    );
    Linking.openURL(redirectUri).catch(e => createAlert('Error', e.message));
  };

  return (
    <View style={Styles.flexBackground}>
      {(displayKey == null || props.loading) ? <AnimatedActivityIndicatorBox /> : (
        <View style={{ flex: 1, marginTop: valuInstalled ? 100 : 0 }}>
          {screens[displayKey]()}
        </View>
      )}
      {valuInstalled && displayKey != null && !props.loading && (
        <TouchableOpacity
          onPress={() => setOpenInAnotherAppVisible(true)}
          style={{
            position: 'absolute',
            top: insets.top + 6,
            right: 16,
            zIndex: 10,
            backgroundColor: Colors.primaryColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: Colors.secondaryColor, fontSize: 12 }}>Open in another app</Text>
        </TouchableOpacity>
      )}
      <Portal>
        <ListSelectionModal
          visible={openInAnotherAppVisible}
          cancel={() => setOpenInAnotherAppVisible(false)}
          title="Open in another app"
          data={[{ key: 'valu', title: 'Open in Valu Mobile' }]}
          onSelect={openInValu}
          flexHeight={0.5}
        />
      </Portal>
    </View>
  );
};

export default GenericRequestHome;
