import { SET_PERSONAL_DATA } from "../../../../utils/constants/storeType"

export const setPersonalData = (
  data = {
    attributes: null,
    contact: null,
    locations: null,
    payment_methods: null,
    images: null,
  }
) => ({
  type: SET_PERSONAL_DATA,
  data,
});