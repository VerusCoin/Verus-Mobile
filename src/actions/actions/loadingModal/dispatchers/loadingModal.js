import store from '../../../../store';
import {
  OPEN_LOADING_MODAL,
  CLOSE_LOADING_MODAL
} from '../../../../utils/constants/storeType';

export const openLoadingModal = (
  message,
  height = 442,
  onCancel = null,
  cancelLabel = "Cancel"
) => {
  store.dispatch({
    type: OPEN_LOADING_MODAL,
    payload: {
      message,
      height,
      onCancel,
      cancelLabel
    },
  });
};

export const closeLoadingModal = () => {
  store.dispatch({
    type: CLOSE_LOADING_MODAL
  });
}
