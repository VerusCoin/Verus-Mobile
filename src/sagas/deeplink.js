import {all, takeEvery, call, put} from 'redux-saga/effects';
import {createAlert} from '../actions/actions/alert/dispatchers/alert';
import {CALLBACK_HOST, SUPPORTED_DLS} from '../utils/constants/constants';
import {
  SET_DEEPLINK_DATA,
  SET_DEEPLINK_URL,
} from '../utils/constants/storeType';
import base64url from 'base64url';
import { Alert, Linking } from 'react-native';
import { URL } from 'react-native-url-polyfill';
import { primitives } from 'verusid-ts-client'
import { MAX_DEEPLINK_STRING_LENGTH } from '../utils/constants/deeplink';
import { DEEPLINK_PROTOCOL_URL_STRING, GENERIC_REQUEST_DEEPLINK_VDXF_KEY, GenericRequest, VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID, VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID } from 'verus-typescript-primitives';
import { isDeeplinkHandlerInstalled } from '../utils/deeplink/isDeeplinkHandlerInstalled';
import { saveProvisioningDeeplinkRequest } from '../utils/deeplink/provisioningDeeplinkStorage';

export default function* deeplinkSaga() {
  yield all([takeEvery(SET_DEEPLINK_URL, handleDeeplinkUrl)]);
}

function* handleDeeplinkUrl(action) {
  const {url: urlstring} = action.payload;

  if (urlstring != null) {
    try {
      if (urlstring.length >= MAX_DEEPLINK_STRING_LENGTH) throw new Error("Deeplink URL max length exceeded.");
      const url = new URL(urlstring);

      const isInternalProtocol = url.protocol === `${DEEPLINK_PROTOCOL_URL_STRING}${VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID}:`;

      if (url.protocol === `${DEEPLINK_PROTOCOL_URL_STRING}:` || isInternalProtocol) {
        const otherHandlerInstalled = yield call(
          isDeeplinkHandlerInstalled,
          VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID,
        );

        if (isInternalProtocol && !otherHandlerInstalled) {
          throw new Error("Internal deeplinks cannot be used unless multiple deeplink handlers are installed.");
        }

        const parseUri = isInternalProtocol
          ? urlstring.replace(
              `${DEEPLINK_PROTOCOL_URL_STRING}${VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID}://`,
              `${DEEPLINK_PROTOCOL_URL_STRING}://`
            )
          : urlstring;
        const req = GenericRequest.fromWalletDeeplinkUri(parseUri);

        if (
          otherHandlerInstalled &&
          !isInternalProtocol &&
          req.hasPreferredHandler() &&
          req.preferredHandler === VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID
        ) {
          const shouldRedirect = yield call(() => new Promise(resolve => {
            Alert.alert(
              'Open in Valu Mobile?',
              'This request prefers to be handled in the Valu Mobile app. Would you like to open it there instead?',
              [
                { text: 'No', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Yes', onPress: () => resolve(true) },
              ]
            );
          }));

          if (shouldRedirect) {
            const redirectUrl = urlstring.replace(
              `${DEEPLINK_PROTOCOL_URL_STRING}://`,
              `${DEEPLINK_PROTOCOL_URL_STRING}${VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID}://`
            );
            yield call([Linking, Linking.openURL], redirectUrl);
            return;
          }
        }

        const requestBufferString = req.toBuffer().toString('hex');
        let savedProvisioningRequest = null;

        try {
          savedProvisioningRequest = yield call(saveProvisioningDeeplinkRequest, {
            requestBufferString,
            uri: parseUri,
          });
        } catch (e) {
          console.warn('Unable to save provisioning deeplink', e?.message ?? e);
        }

        yield call(handleFinishDeeplink, {
          type: SET_DEEPLINK_DATA,
          payload: {
            id: GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
            data: requestBufferString,
            passthrough: savedProvisioningRequest
              ? {
                  pendingProvisioningDeeplinkId: savedProvisioningRequest.id,
                }
              : null,
          },
        });
      } else {
        if (url.host !== CALLBACK_HOST) throw new Error('Unsupported host url.');

        const id = url.pathname.split('/')[1];

        if (!SUPPORTED_DLS.includes(id)) throw new Error('Unsupported deeplink type.');

        if (id === primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid) {
          const req = new primitives.LoginConsentRequest();
          req.fromBuffer(
            base64url.toBuffer(
              url.searchParams.get(
                primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
              ),
            ),
          );

          yield call(handleFinishDeeplink, {
            type: SET_DEEPLINK_DATA,
            payload: {
              id,
              data: req.toJson(),
            },
          });
        } else if (id === primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid) {
          const inv = primitives.VerusPayInvoice.fromWalletDeeplinkUri(urlstring);

          yield call(handleFinishDeeplink, {
            type: SET_DEEPLINK_DATA,
            payload: {
              id,
              data: inv.toJson(),
              uri: urlstring
            },
          });
        }
        // else if (id === primitives.IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid) {
        //   const req = primitives.IdentityUpdateRequest.fromWalletDeeplinkUri(urlstring);

        //   yield call(handleFinishDeeplink, {
        //     type: SET_DEEPLINK_DATA,
        //     payload: {
        //       id,
        //       data: req.toJson(),
        //       uri: urlstring
        //     },
        //   });
        // }
      }
    } catch (e) {
      console.error(e)
      
      createAlert('Error', e.message);
    }
  }
}

function* handleFinishDeeplink(action) {
  yield put(action);
}
