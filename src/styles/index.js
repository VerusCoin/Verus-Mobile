import roots from './roots.styles';
import buttons from './buttons.styles';
import text from './text.styles';
import containers from './containers.styles';
import {StyleSheet} from 'react-native';
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

export {default as slideToConfirmStyles} from './components/slideToConfirm.styles';
export {default as appButtonStyles} from './components/appButton.styles';
export {default as appAddressInputStyles} from './components/appAddressInput.styles';
export {default as appEncryptionRequestInfoStyles} from './deeplink/appEncryptionRequestInfo.styles';
export {default as appSearchStyles} from './components/appSearch.styles';
export {default as appTextInputStyles} from './components/appTextInput.styles';
export {default as createTextActionStyles} from './components/textAction.styles';
export {default as authenticationRequestInfoStyles} from './deeplink/authenticationRequestInfo.styles';
export {default as authorityInfoSheetStyles} from './deeplink/authorityInfoSheet.styles';
export {default as barcodeReaderStyles} from './components/barcodeReader.styles';
export {default as confirmPayStepStyles} from './deeplink/confirmPayStep.styles';
export {default as copyActionStyles} from './components/copyAction.styles';
export {default as draggableSheetStyles} from './components/draggableSheet.styles';
export {default as dataRequestInfoStyles} from './deeplink/dataRequestInfo.styles';
export {default as deepLinkRequestReviewStyles} from './components/deepLinkRequestReview.styles';
export {default as gradientButtonStyles} from './components/gradientButton.styles';
export {
  default as emptyStateStyles,
  EMPTY_STATE_GLYPH_SIZE,
  GLYPH_STROKE_WIDTH,
  STEP_GLYPH_SIZE,
  stepGlyphStyles,
} from './components/glyph.styles';
export {default as highRiskStepStyles} from './deeplink/highRiskStep.styles';
export {default as identityPickerSheetStyles} from './deeplink/identityPickerSheet.styles';
export {default as identityUpdateRequestInfoStyles} from './deeplink/identityUpdateRequestInfo.styles';
export {default as invoiceInfoStyles} from './deeplink/invoiceInfo.styles';
export {default as listSelectionModalStyles} from './components/listSelectionModal.styles';
export {default as nfcTapStyles} from './components/nfcTap.styles';
export {default as reviewStepStyles} from './deeplink/reviewStep.styles';
export {default as revokeRecoverFlowStyles} from './components/revokeRecoverFlow.styles';
export {default as spendableKeyRequestInfoStyles} from './deeplink/spendableKeyRequestInfo.styles';
export {default as signedOutFlowStyles} from './components/signedOutFlow.styles';
export {default as signedOutSheetStyles} from './components/signedOutSheet.styles';
export {default as createSignedInStyles} from './components/signedIn.styles';
export {default as skeletonLoaderStyles} from './components/skeletonLoader.styles';
export {default as statusBadgeStyles} from './components/statusBadge.styles';
export {createSignedOutFlowStyles} from './components/signedOutFlow.styles';
export {createSignedOutSheetStyles} from './components/signedOutSheet.styles';
export {default as vdxfUniValueModalInnerAreaStyles} from './components/vdxfUniValueModalInnerArea.styles';
export {default as verusIdObjectDataStyles} from './components/verusIdObjectData.styles';
export {default as walletBackupRequestInfoStyles} from './deeplink/walletBackupRequestInfo.styles';

export {createSelectionSheetStyles} from './components/selectionSheet.styles';

export default Styles;

export {createInfoSheetStyles} from './components/infoSheet.styles';

export {default as paymentRequestSlipStyles} from './components/paymentRequestSlip.styles';
export {default as requestCardStyles} from './components/requestCard.styles';

export {default as dataApprovalListStyles} from './components/dataApprovalList.styles';
export {createAmountKeypadStyles} from './components/amountKeypad.styles';
export {default as progressHeaderStyles} from './components/progressHeader.styles';
export { default as homeValueChartStyles } from './components/homeValueChart.styles';
export {identityManagementStyles} from './components/identityManagement.styles';
export {createIdentityRegistrationStyles} from './components/identityRegistration.styles';
