import roots from './roots.styles'
import buttons from './buttons.styles'
import text from './text.styles'
import containers from './containers.styles'
import { StyleSheet } from "react-native";
import misc from './misc.styles';
import tables from './tables.styles';

const Styles = StyleSheet.create({
  ...roots,
  ...buttons,
  ...text,
  ...containers,
  ...misc,
  ...tables,
});

export {
  default as authenticationRequestInfoStyles,
} from './deeplink/authenticationRequestInfo.styles';
export {
  default as authorityInfoSheetStyles,
} from './deeplink/authorityInfoSheet.styles';
export {
  default as confirmPayStepStyles,
} from './deeplink/confirmPayStep.styles';
export {
  default as genericRequestCompleteStyles,
} from './deeplink/genericRequestComplete.styles';
export {
  default as gradientButtonStyles,
} from './components/gradientButton.styles';
export {
  default as highRiskStepStyles,
} from './deeplink/highRiskStep.styles';
export {
  default as identityPickerSheetStyles,
} from './deeplink/identityPickerSheet.styles';
export {
  default as identityUpdateRequestInfoStyles,
} from './deeplink/identityUpdateRequestInfo.styles';
export {
  default as invoiceInfoStyles,
} from './deeplink/invoiceInfo.styles';
export {
  default as listSelectionModalStyles,
} from './components/listSelectionModal.styles';
export {
  default as reviewStepStyles,
} from './deeplink/reviewStep.styles';
export {
  default as vdxfUniValueModalInnerAreaStyles,
} from './components/vdxfUniValueModalInnerArea.styles';
export {
  default as verusIdObjectDataStyles,
} from './components/verusIdObjectData.styles';

export default Styles;
