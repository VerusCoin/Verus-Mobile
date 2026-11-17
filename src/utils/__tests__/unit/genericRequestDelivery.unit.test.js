jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('react-native', () =>
  require('../../../tests/helpers/mockReactNative')({
    Linking: {
      openURL: jest.fn(),
    },
    Platform: {
      OS: 'ios',
    },
  }),
);

// The delivery module reads the app-encryption session from the store. The
// real store loads every saga and service, which this selection test does not need.
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: jest.fn(() => ({}))},
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    getBasicCoinObj: jest.fn(),
  },
}));

jest.mock('../../CoinData/CoinData', () => ({
  getSystemNameFromSystemId: jest.fn(),
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  signGenericResponse: jest.fn(),
}));

jest.mock(
  '../../api/channels/vrpc/requests/verifyGenericResponse',
  () => ({
    verifyGenericResponse: jest.fn(),
  }),
);

jest.mock(
  '../../deeplink/genericResponse/encryptGenericResponseDetails',
  () => ({
    encryptGenericResponseDetails: jest.fn(),
  }),
);

jest.mock(
  '../../deeplink/genericResponse/prepareGenericResponseForSigning',
  () => ({
    prepareGenericResponseForSigning: jest.fn(),
  }),
);

import {ResponseURI} from 'verus-typescript-primitives';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
  getResponseUri,
} from '../../deeplink/genericRequestDelivery';

const makeResponseUri = (type, uriString) => ({
  getUriString: () => uriString,
  type,
});

describe('generic request delivery selection', () => {
  it('selects POST regardless of its position in the response URI list', () => {
    const redirectUri = makeResponseUri(
      ResponseURI.TYPE_REDIRECT,
      'https://wallet.example/finished',
    );
    const postUri = makeResponseUri(
      ResponseURI.TYPE_POST,
      'https://requester.example/generic-response',
    );

    expect(getResponseUri([redirectUri, postUri])).toBe(postUri);
    expect(
      getGenericRequestDeliveryInfo({
        responseURIs: [redirectUri, postUri],
      }),
    ).toEqual({
      type: GENERIC_REQUEST_DELIVERY_TYPES.POST,
      responseUri: postUri,
      uriString: 'https://requester.example/generic-response',
      destinationHost: 'https://requester.example',
    });
  });

  it('falls back to redirect delivery when no POST URI exists', () => {
    const redirectUri = makeResponseUri(
      ResponseURI.TYPE_REDIRECT,
      'https://wallet.example/finished',
    );

    expect(
      getGenericRequestDeliveryInfo({
        responseURIs: [redirectUri],
      }),
    ).toEqual({
      type: GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT,
      responseUri: redirectUri,
      uriString: 'https://wallet.example/finished',
      destinationHost: 'https://wallet.example',
    });
  });

  it('reports no delivery destination when response URIs are absent', () => {
    expect(getGenericRequestDeliveryInfo({responseURIs: []})).toEqual({
      type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
      responseUri: null,
      uriString: null,
      destinationHost: null,
    });
  });
});
