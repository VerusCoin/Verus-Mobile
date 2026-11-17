import React from 'react';
import AppButton from '../../../AppButton';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import {
  RevokeRecoverAcknowledgement,
  RevokeRecoverLoadingState,
  RevokeRecoverNotice,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';
import {
  IdentityContext,
  RecoveryValue,
  identityName,
} from '../../../../containers/RevokeRecover/RecoveryValues';

export const RevokeIdentityConfirmRender = ({
  acknowledged,
  fee,
  feeCurrency,
  goBack,
  loading,
  networkName,
  onAcknowledgedChange,
  revocationId,
  submitData,
  submitError,
  targetId,
}) => {
  if (loading)
    return (
      <RevokeRecoverFlowScaffold
        backDisabled
        showBack={false}
        showProgress={false}
        headerTitle="Submitting revocation"
        keyboardAvoiding={false}>
        <RevokeRecoverLoadingState body="Keep Verus Mobile open while the transaction is submitted." />
      </RevokeRecoverFlowScaffold>
    );

  return (
    <RevokeRecoverFlowScaffold
      headerTitle="Review revocation"
      error={submitError}
      onBack={goBack}
      progress={0.85}
      actions={submitError ? (
        <AppButton onPress={goBack} testID="revokeRecover.reviewAgain">
          Review again
        </AppButton>
      ) : (
        <>
          <RevokeRecoverAcknowledgement
            label="I understand this VerusID will be disabled until it is recovered."
            onValueChange={onAcknowledgedChange}
            value={acknowledged}
          />
          <AppButton
            disabled={!acknowledged}
            onPress={submitData}
            testID="revokeRecover.submit"
            variant="destructive">
            Submit revocation
          </AppButton>
        </>
      )}>
      <IdentityContext
        name={identityName(targetId)}
        networkName={networkName}
        status="Active → Revoked"
      />
      <RevokeRecoverStepCopy body="This disables the VerusID until its recovery authority restores it. Check the identity before signing." />
      <RecoveryValue
        label="Revocation authority"
        value={identityName(revocationId)}
      />
      <RevokeRecoverStepCopy />
      <RecoveryValue
        label="Identity address"
        value={targetId?.identity?.identityaddress}
        technical
      />
      <RevokeRecoverStepCopy />
      <RecoveryValue label="Network fee" value={`${fee} ${feeCurrency}`} />
      {submitError ? (
        <RevokeRecoverNotice tone="danger">{submitError}</RevokeRecoverNotice>
      ) : null}
    </RevokeRecoverFlowScaffold>
  );
};
