const {deeplink} = require('../../../reducers/deeplink');
const {setDeeplinkData, setDeeplinkUrl, resetDeeplinkData} = require('../../../actions/actions/deeplink/creators/deeplink');
const {SIGN_OUT, SIGN_OUT_COMPLETE} = require('../../constants/storeType');

const open = state => deeplink(deeplink(state, setDeeplinkUrl('verus://request')), setDeeplinkData('generic', 'request-hex', 'service', {private: 'payload'}));

it('clears transient request data and URL on wallet sign-out', () => {
  const opened = open();
  const closed = deeplink(opened, {type: SIGN_OUT});
  expect(closed).toEqual({url: null, id: null, data: {}, fromService: null, passthrough: null, requestId: opened.requestId + 1, parsingUrl: false});
});

it('does not erase a new signed-out request when old wallet teardown finishes', () => {
  const closed = deeplink(open(), {type: SIGN_OUT});
  const signedOutRequest = open(closed);
  expect(deeplink(signedOutRequest, {type: SIGN_OUT_COMPLETE})).toBe(signedOutRequest);
});

it('guarded close cannot erase a replacement request even when its bytes are identical', () => {
  const first = open();
  const replacement = open(first);
  expect(deeplink(replacement, resetDeeplinkData(first.requestId))).toBe(replacement);
  expect(deeplink(replacement, resetDeeplinkData(replacement.requestId))).toMatchObject({url: null, id: null, data: {}, passthrough: null});
});
