import {all, takeEvery, call, put} from 'redux-saga/effects';
import {createAlert} from '../actions/actions/alert/dispatchers/alert';
import {CALLBACK_HOST, SUPPORTED_DLS} from '../utils/constants/constants';
import {
  SET_DEEPLINK_DATA,
  SET_DEEPLINK_URL,
} from '../utils/constants/storeType';
import base64url from 'base64url';
import { URL } from 'react-native-url-polyfill';
import { primitives } from 'verusid-ts-client'

export default function* deeplinkSaga() {
  yield all([takeEvery(SET_DEEPLINK_URL, handleDeeplinkUrl)]);
}

function* handleDeeplinkUrl(action) {
  const {url: urlstring} = action.payload;

  if (urlstring != null) {
    try {
      const url = new URL(urlstring);
  
      if (url.host !== CALLBACK_HOST) throw new Error('Unsupported host url.');
  
      const id = url.pathname.split('/')[1];
  
      if (!SUPPORTED_DLS.includes(id)) throw new Error('Unsupported url path.');

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
    } catch (e) {
      console.error(e)
      
      createAlert('Error', e.message);
    }
  }
}

function* handleFinishDeeplink(action) {
  yield put(action);
}
