import {useRequestBackHandler} from '../useRequestNavigation';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {GenericResponse} from 'verus-typescript-primitives';
import {OnboardingThemeProvider} from '../../../theme/onboarding';
import {
  getMissingCredentialKeys,
  getScopedCredentials,
} from '../../../utils/deeplink/credentials/scopedCredentials';
import {buildUserDataResponse} from '../../../utils/deeplink/userData/buildUserDataResponse';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {createRequestSessionGuard} from '../../../utils/deeplink/requestSessionGuard';
import useDataRequestIdentity from '../components/RequestReview/useDataRequestIdentity';
import useDataReviewConsent from '../components/RequestReview/useDataReviewConsent';
import DataRequestReview, {
  DataReviewLoading,
  DataReviewNotice,
  DataReviewValue,
} from '../components/RequestReview/DataRequestReview';

const UserDataRequestInfoContent = props => {
  const {
    credentialRequests = [],
    requestScope,
    signerSystemID,
    response,
    request,
    detailIndex,
    next,
    hasFollowingDetails = false,
  } = props;
  const identity = useDataRequestIdentity(props);
  const [retry, setRetry] = useState(0);
  const [lookup, setLookup] = useState({
    context: null,
    status: 'loading',
    credentials: [],
  });
  const [processing, setProcessing] = useState(false);
  useRequestBackHandler(props.cancel, processing);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const keysString = JSON.stringify(credentialRequests.map(item => item.key));
  const credentialKeys = useMemo(() => JSON.parse(keysString), [keysString]);
  const context = useMemo(
    () => ({}),
    [
      identity.context,
      identity.selectedIdentity?.iAddress,
      requestScope,
      keysString,
      signerSystemID,
      retry,
    ],
  );
  const currentContext = useRef(context);
  currentContext.current = context;
  useEffect(
    () => () => {
      currentContext.current = null;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (
      !identity.walletReady ||
      !identity.selectedIdentity ||
      identity.signerConflict
    )
      return undefined;
    setLookup({context, status: 'loading', credentials: []});
    getScopedCredentials({
      systemID: signerSystemID,
      identityAddress: identity.selectedIdentity.iAddress,
      scope: requestScope,
      credentialKeys,
    })
      .then(credentials => {
        if (!cancelled) setLookup({context, status: 'ready', credentials});
      })
      .catch(() => {
        if (!cancelled) setLookup({context, status: 'error', credentials: []});
      });
    return () => {
      cancelled = true;
    };
  }, [
    context,
    identity.walletReady,
    identity.selectedIdentity?.iAddress,
    identity.signerConflict,
    signerSystemID,
    requestScope,
    credentialKeys,
  ]);

  const status = lookup.context === context ? lookup.status : 'loading';
  const credentials = status === 'ready' ? lookup.credentials : [];
  const missing =
    status === 'ready'
      ? getMissingCredentialKeys(credentialKeys, credentials)
      : [];
  const consentContext = useMemo(() => ({}), [context, lookup]);
  const consent = useDataReviewConsent(consentContext);
  const reviewComplete =
    status === 'ready' &&
    credentials.every((_, index) => consent.checked[index]);
  const hasOtherResponseContent = !!response?.details?.length;

  const approvalItems = credentials.map((credential, index) => ({
    key: index,
    title: credential.label || `Credential ${index + 1}`,
    content: <DataReviewValue value={credential.credential} />,
    details: [
      {
        label: 'Credential key',
        value: credential.credentialKey,
        technical: true,
        copy: true,
      },
      {label: 'Full credential value', value: credential.credential},
      {label: 'Scopes', value: credential.scopes},
    ],
  }));

  const handleContinue = async () => {
    if (
      inFlight.current ||
      !identity.walletReady ||
      !identity.selectedIdentity ||
      identity.signerConflict
    )
      return;
    if (status === 'error') {
      setRetry(value => value + 1);
      return;
    }
    if (!reviewComplete || status !== 'ready') return;
    inFlight.current = true;
    setProcessing(true);
    setError(null);
    try {
      const updatedResponse = new GenericResponse();
      if (response?.details?.length)
        updatedResponse.fromBuffer(response.toBuffer(), 0);
      else if (response)
        Object.assign(updatedResponse, response, {details: []});
      const responseDetail = buildUserDataResponse({
        userDataDetail: request.getDetails(detailIndex).data,
        credentials,
      });
      updatedResponse.details = [
        ...(updatedResponse.details || []),
        ...(responseDetail ? [responseDetail] : []),
      ];
      if (updatedResponse.details.length)
        ensureGenericResponseSigner({
          response: updatedResponse,
          systemID: identity.coinObj.system_id,
          identityID: identity.selectedIdentity.iAddress,
        });
      updatedResponse.setFlags();
      createRequestSessionGuard(() => {
        if (currentContext.current !== context)
          throw new Error('Review changed');
      }, identity.sessionScope).assertCurrent();
      await next(updatedResponse, [detailIndex], {
        autoDeliverOnComplete: true,
        responseIdentityName: identity.selectedIdentity.friendlyName,
        sharedCredentialCount: credentials.length,
      });
    } catch (_) {
      inFlight.current = false;
      setProcessing(false);
      setError(
        'Unable to prepare the response. Review your VerusID and try again.',
      );
    }
  };

  return (
    <DataRequestReview
      requestAction="wants credentials"
      responderWord="from"
      responseCaption={host =>
        status === 'ready' && credentials.length === 0
          ? null
          : `The wallet encrypts your credentials for the requester and sends them to ${host}.`
      }
      props={props}
      identity={identity}
      onContinue={handleContinue}
      processing={processing}
      error={error}
      disabled={status === 'loading'}
      approvalItems={approvalItems}
      consent={consent}
      primaryLabel={
        status === 'error'
          ? 'Retry credential lookup'
          : status === 'loading'
          ? 'Loading credentials'
          : credentials.length === 0
          ? 'Continue without credentials'
          : `Share ${
              credentials.length === 1
                ? 'credential'
                : `${credentials.length} credentials`
            }`
      }
      detailsSections={[
        {
          title: 'Credentials',
          rows: [
            {label: 'Scope', value: requestScope},
            {label: 'Requested keys', value: credentialKeys.join('\n')},
            {
              label: 'Unavailable keys',
              value: missing.length ? missing.join('\n') : null,
            },
            {label: 'Response content', value: 'Full credential data'},
            {label: 'Encryption', value: 'Required'},
          ],
        },
      ]}>
      {status === 'loading' ? (
        <DataReviewLoading label="Looking up credentials" />
      ) : status === 'error' ? (
        <DataReviewNotice title="Unable to load credentials">
          Your credentials could not be read. Retry, or choose another VerusID.
        </DataReviewNotice>
      ) : credentials.length === 0 ? (
        <DataReviewNotice title="No matching credentials">
          {hasOtherResponseContent
            ? 'No credentials will be shared. The response contains only the other approved items.'
            : hasFollowingDetails
            ? 'No credentials will be shared. Continue to review the rest of the request.'
            : 'No response will be sent to the requester.'}
        </DataReviewNotice>
      ) : missing.length > 0 ? (
        <DataReviewNotice title="Some credentials are unavailable">
          {`${missing.length} of ${credentialKeys.length} requested credential types are missing. Only the credentials below will be shared.`}
        </DataReviewNotice>
      ) : null}
    </DataRequestReview>
  );
};

export default function UserDataRequestInfo(props) {
  return (
    <OnboardingThemeProvider>
      <UserDataRequestInfoContent
        key={`${props.detailIndex}:${props.detailsBufferString}`}
        {...props}
      />
    </OnboardingThemeProvider>
  );
}
