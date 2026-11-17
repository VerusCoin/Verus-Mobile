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
import RecoveryValues, {
  IdentityContext,
  RecoveryValue,
  identityName,
  recoveryValues,
} from '../../../../containers/RevokeRecover/RecoveryValues';

export const RecoverIdentityConfirmRender = ({
  acknowledged,
  fee,
  feeCurrency,
  friendlyNames,
  goBack,
  loading,
  networkName,
  onAcknowledgedChange,
  primaryAddr,
  privateAddr,
  recoveryAddr,
  revocationAddr,
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
        headerTitle="Submitting recovery"
        keyboardAvoiding={false}>
        <RevokeRecoverLoadingState body="Keep Verus Mobile open while the transaction is submitted." />
      </RevokeRecoverFlowScaffold>
    );

  return (
    <RevokeRecoverFlowScaffold
      headerTitle="Review recovery"
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
            label="I checked these changes"
            onValueChange={onAcknowledgedChange}
            value={acknowledged}
          />
          <AppButton
            disabled={!acknowledged}
            onPress={submitData}
            testID="revokeRecover.submit">
            Submit recovery
          </AppButton>
        </>
      )}>
      <IdentityContext
        name={identityName(targetId)}
        networkName={networkName}
        status="Revoked → Active"
      />
      <RevokeRecoverStepCopy body="Recovery changes control of this VerusID. Check the values below." />
      <RecoveryValues
        values={recoveryValues({
          targetId,
          primaryAddr,
          recoveryAddr,
          revocationAddr,
          privateAddr,
          friendlyNames,
        })}
        title="Values after recovery"
      />
      <RecoveryValue label="Network fee" value={`${fee} ${feeCurrency}`} />
      {submitError ? (
        <RevokeRecoverNotice tone="danger">{submitError}</RevokeRecoverNotice>
      ) : null}
    </RevokeRecoverFlowScaffold>
  );
};
