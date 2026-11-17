/*
  Regression coverage for the session/operation guard on the GenericRequest
  resumption helper. The guard is optional, so callers that do not supply one
  keep the original dispatch/navigate behavior.
*/

const mockSavePendingDeeplinkRequest = jest.fn();

jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({
  savePendingDeeplinkRequest: (...args) =>
    mockSavePendingDeeplinkRequest(...args),
  getPendingDeeplinkPassthrough: () => ({pendingDeeplinkId: 'pending-1'}),
}));

jest.mock('verusid-ts-client', () => ({
  primitives: {
    GENERIC_REQUEST_DEEPLINK_VDXF_KEY: {vdxfid: 'generic-request'},
    LOGIN_CONSENT_REQUEST_VDXF_KEY: {vdxfid: 'login-consent'},
    LoginConsentRequest: class {
      fromBuffer() {}
      toJson() {
        return {request: true};
      }
    },
  },
}));

const {
  processVerusId,
} = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdLogin');

const buildProps = () => ({
  dispatch: jest.fn(),
  navigation: {navigate: jest.fn()},
});

describe('processVerusId resume guard', () => {
  beforeEach(() => {
    mockSavePendingDeeplinkRequest.mockReset();
  });

  it('dispatches and navigates when no guard is supplied', async () => {
    mockSavePendingDeeplinkRequest.mockResolvedValue({id: 'pending-1'});
    const props = buildProps();

    await processVerusId(props, 'payload', null, null, 'generic');

    expect(props.dispatch).toHaveBeenCalledTimes(1);
    expect(props.navigation.navigate).toHaveBeenCalledWith('DeepLink', {
      screen: 'VerifyDeepLink',
    });
  });

  it('does not dispatch or navigate when the guard is already stale', async () => {
    mockSavePendingDeeplinkRequest.mockResolvedValue({id: 'pending-1'});
    const props = buildProps();
    const guard = jest.fn(() => false);

    const result = await processVerusId(
      props,
      'payload',
      null,
      null,
      'generic',
      null,
      guard,
    );

    expect(result).toBeNull();
    expect(mockSavePendingDeeplinkRequest).not.toHaveBeenCalled();
    expect(props.dispatch).not.toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not dispatch or navigate when a deferred save invalidates the guard', async () => {
    let guardCurrent = true;
    let releaseSave;
    mockSavePendingDeeplinkRequest.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseSave = () => resolve({id: 'pending-1'});
        }),
    );
    const props = buildProps();
    const guard = () => guardCurrent;

    const pending = processVerusId(
      props,
      'payload',
      null,
      null,
      'generic',
      null,
      guard,
    );

    // The account switched or a newer operation started while the pending
    // request was still being saved.
    await Promise.resolve();
    guardCurrent = false;
    releaseSave();
    const result = await pending;

    expect(result).toBeNull();
    expect(props.dispatch).not.toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not dispatch or navigate the login-consent path when stale', async () => {
    const props = buildProps();
    const guard = jest.fn(() => false);

    const result = await processVerusId(
      props,
      'cGF5bG9hZA==',
      null,
      null,
      'loginconsent',
      null,
      guard,
    );

    expect(result).toBeNull();
    expect(props.dispatch).not.toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('re-checks the guard between the generic dispatch and navigation', async () => {
    mockSavePendingDeeplinkRequest.mockResolvedValue({id: 'pending-1'});
    const props = buildProps();
    // The guard is live for the storage await and the dispatch, then goes stale
    // before the navigation that follows the dispatch.
    let guardCurrent = true;
    const guard = () => guardCurrent;

    props.dispatch.mockImplementation(() => {
      guardCurrent = false;
    });

    const result = await processVerusId(
      props,
      'payload',
      null,
      null,
      'generic',
      null,
      guard,
    );

    expect(props.dispatch).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('re-checks the guard between the login-consent dispatch and navigation', async () => {
    const props = buildProps();
    let guardCurrent = true;
    const guard = () => guardCurrent;

    props.dispatch.mockImplementation(() => {
      guardCurrent = false;
    });

    const result = await processVerusId(
      props,
      'cGF5bG9hZA==',
      null,
      null,
      'loginconsent',
      null,
      guard,
    );

    expect(props.dispatch).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });
});
