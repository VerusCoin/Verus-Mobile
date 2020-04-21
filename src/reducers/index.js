import { combineReducers } from 'redux';
import { authentication } from './authentication';
import { coins } from './coins';
import { ledger } from './ledger';
import { settings } from './settings';
import { electrum } from './cache/electrum';
import { headers } from './cache/headers';
import { customCoins } from './gui/customCoins';
import { buySellCrypto } from './gui/buySellCrypto';
import { paymentMethods } from './paymentMethods';
import { updates } from './updates';
import { responseHeaders } from './responseHeaders';
import { errors } from './errors';
import { coinOverview } from './gui/coinOverview';
import identity from './identity';

export default combineReducers({
  authentication,
  coins,
  ledger,
  settings,
  electrum,
  headers,
  customCoins,
  buySellCrypto,
  paymentMethods,
  updates,
  errors,
  responseHeaders,
  coinOverview,
  identity,
});
