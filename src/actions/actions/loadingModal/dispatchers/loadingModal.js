import store from '../../../../store';
import {
  OPEN_LOADING_MODAL,
  CLOSE_LOADING_MODAL
} from '../../../../utils/constants/storeType';

export const openLoadingModal = (
  message,
  height = 442
) => {
  store.dispatch({
    type: OPEN_LOADING_MODAL,
    payload: {
      message,
      height
    },
  });
};

export const closeLoadingModal = () => {
  store.dispatch({
    type: CLOSE_LOADING_MODAL
  });
}