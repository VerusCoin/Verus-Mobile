import { SET_PERSONAL_DATA } from "../../../../utils/constants/storeType"

export const setPersonalData = (data = { attributes: null, contact: null }) => ({
  type: SET_PERSONAL_DATA,
  data
})