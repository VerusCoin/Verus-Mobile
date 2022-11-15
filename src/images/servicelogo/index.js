import { VERUSID_SERVICE_ID, WYRE_SERVICE_ID } from '../../utils/constants/services'
import WYRE_LIGHT from './wyre/wyre_light.svg'
import VERUSID_LIGHT from './verusid/verusid_light.svg'

export default {
  [WYRE_SERVICE_ID]: { light: WYRE_LIGHT },
  [VERUSID_SERVICE_ID]: { light: VERUSID_LIGHT }
}