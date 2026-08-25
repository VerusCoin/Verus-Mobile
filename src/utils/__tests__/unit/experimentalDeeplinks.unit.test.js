const {
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
} = require('verus-typescript-primitives');
const {
  EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE,
  assertExperimentalDeeplinkAllowed,
  assertExperimentalGenericRequestAllowed,
  isExperimentalGenericRequestDetailKey,
} = require('../../deeplink/experimentalDeeplinks');

const disabledState = {
  settings: {
    generalWalletSettings: {
      enableExperimentalGenericRequests: false,
    },
  },
};

const enabledState = {
  settings: {
    generalWalletSettings: {
      enableExperimentalGenericRequests: true,
    },
  },
};

const detail = key => ({
  getIAddressKey: () => key,
});

describe('experimental deeplink gating', () => {
  const experimentalDetailKeys = [
    IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid,
    APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid,
    USER_DATA_REQUEST_VDXF_KEY.vdxfid,
    DATA_PACKET_REQUEST_VDXF_KEY.vdxfid,
  ];

  it('marks each experimental generic request detail key as experimental', () => {
    for (const detailKey of experimentalDetailKeys) {
      expect(isExperimentalGenericRequestDetailKey(detailKey)).toBe(true);
    }
  });

  it('blocks experimental generic request details when the setting is disabled', () => {
    for (const detailKey of experimentalDetailKeys) {
      expect(() =>
        assertExperimentalGenericRequestAllowed(
          {details: [detail(detailKey)]},
          disabledState,
        ),
      ).toThrow(EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE);
    }
  });

  it('allows experimental generic request details when the setting is enabled', () => {
    expect(() =>
      assertExperimentalGenericRequestAllowed(
        {details: experimentalDetailKeys.map(detail)},
        enabledState,
      ),
    ).not.toThrow();
  });

  it('blocks standalone identity update deeplinks when the setting is disabled', () => {
    expect(() =>
      assertExperimentalDeeplinkAllowed(
        IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid,
        disabledState,
      ),
    ).toThrow(EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE);
  });
});
