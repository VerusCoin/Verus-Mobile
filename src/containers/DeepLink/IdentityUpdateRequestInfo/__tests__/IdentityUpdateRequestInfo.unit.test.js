import React from 'react';
import {AccessibilityInfo} from 'react-native';
import {Provider as PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {act, create} from 'react-test-renderer';

import IdentityUpdateRequestInfo from '../IdentityUpdateRequestInfo';

jest.mock(
  '../../../../images/customIcons/TwentyFourWordIcon',
  () => 'TwentyFourWordIcon',
  {virtual: true},
);
jest.mock('../../../../images/customIcons/EnterKeyIcon', () => 'EnterKeyIcon', {
  virtual: true,
});
jest.mock('../../../../images/customIcons/ScanQrIcon', () => 'ScanQrIcon', {
  virtual: true,
});
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => 'MaterialCommunityIcons',
);

const authenticationState = {
  accounts: [],
  activeAccount: null,
  signedIn: false,
};

jest.mock('react-redux', () => {
  const ReactModule = require('react');

  return {
    connect: () => Component => props =>
      ReactModule.createElement(Component, {
        ...props,
        dispatch: jest.fn(),
      }),
    useSelector: selector =>
      selector({
        authentication: authenticationState,
      }),
  };
});

const subjectIdentity = {
  fullyqualifiedname: 'alice@',
  identity: {
    flags: 0,
    primaryaddresses: [],
    recoveryauthority: null,
    revocationauthority: null,
    privateaddress: null,
    contentmultimap: {},
  },
};

describe('identity update request review', () => {
  beforeEach(() => {
    AccessibilityInfo.addEventListener = jest.fn(() => ({
      remove: jest.fn(),
    }));
    AccessibilityInfo.isReduceMotionEnabled = jest.fn(() =>
      Promise.resolve(false),
    );
  });

  it('renders a flag update before parsed identity details are available', () => {
    let screen;

    expect(() => {
      act(() => {
        screen = create(
          <SafeAreaProvider
            initialMetrics={{
              frame: {x: 0, y: 0, width: 390, height: 844},
              insets: {top: 47, right: 0, bottom: 34, left: 0},
            }}>
            <PaperProvider>
              <IdentityUpdateRequestInfo
                cancel={jest.fn()}
                chainInfo={{longestchain: 1}}
                cmmDataKeys={{}}
                coinObj={{
                  id: 'VRSC',
                  mainnet_id: 'VRSC',
                  seconds_per_block: 60,
                  system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
                  testnet: false,
                }}
                friendlyNames={{}}
                hasEncryptedKeys={false}
                identityUpdates={{
                  ...subjectIdentity.identity,
                  flags: 1,
                }}
                next={jest.fn()}
                sigtime={0}
                subjectIdentity={subjectIdentity}
                subjectIdentityContent={subjectIdentity}
              />
            </PaperProvider>
          </SafeAreaProvider>,
        );
      });
    }).not.toThrow();

    act(() => {
      screen.unmount();
    });
  });
});
