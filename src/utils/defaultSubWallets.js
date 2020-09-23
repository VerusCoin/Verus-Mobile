import { DLIGHT, ELECTRUM } from "./constants/intervalConstants"
import { ENABLE_DLIGHT } from '../../env/main.json'

export const getDefaultSubWallets = (coinObj) => {
  return coinObj.compatible_channels.includes(DLIGHT) && ENABLE_DLIGHT ? [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    id: "MAIN_WALLET",
    params: {},
    color: '#2E86AB'
  },
  {
    channel: DLIGHT,
    id: "PRIVATE_WALLET",
    params: {},
    color: '#EDAE49'
  }] : [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    id: "MAIN_WALLET",
    params: {},
    color: '#2E86AB'
  }]
}