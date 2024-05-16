import { combineReducers } from 'redux';
import { authentication } from './authentication';
import { coins } from './coins';
import { ledger } from './ledger';
import { settings } from './settings';
import { personal } from './personal';
import { attestation } from './attestations';
import { services } from './services';
import { electrum } from './cache/electrum';
import { headers } from './cache/headers';
import { ethtxreceipts } from './cache/ethtxreceipts';
import { customCoins } from './gui/customCoins';
import { buySellCrypto } from './gui/buySellCrypto';
import { coinMenus } from './gui/coinMenus';
import { paymentMethods } from './paymentMethods';
import { updates } from './updates';
import { responseHeaders } from './responseHeaders';
import { errors } from './errors';
import { coinOverview } from './gui/coinOverview';
import { channelStore_dlight_private } from './channelStores/dlight';
import { channelStore_eth } from './channelStores/eth';
import { channelStore_erc20 } from './channelStores/erc20';
import { channelStore_vrpc } from './channelStores/vrpc';
import { channelStore_verusid } from './channelStores/verusid';
import { channelStore_electrum } from './channelStores/electrum';
import { channelStore_general } from './channelStores/general';
import { channelStore_wyre_service } from './channelStores/wyre';
import { alert } from './alert'
import { modal } from './modal'
import { notifications } from './notifications'
import { widgets } from './widgets'
import { keyboard } from './keyboard'
import identity from './identity';
import { sendModal } from './sendModal';
import { loadingModal } from './loadingModal';
import { secureLoading } from './secureLoading';
import { deeplink } from './deeplink';


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
  channelStore_dlight_private,
  channelStore_eth,
  channelStore_electrum,
  channelStore_erc20,
  channelStore_vrpc,
  channelStore_general,
  channelStore_wyre_service,
  channelStore_verusid,
  ethtxreceipts,
  coinMenus,
  alert,
  modal,
  notifications,
  widgets,
  keyboard,
  personal,
  services,
  sendModal,
  loadingModal,
  secureLoading,
  deeplink,
  attestation
});
