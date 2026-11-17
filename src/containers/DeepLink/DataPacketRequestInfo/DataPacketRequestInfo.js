import {useRequestBackHandler} from '../useRequestNavigation';
import React, {useMemo, useRef, useState, useEffect} from 'react';
import {Text} from 'react-native-paper';
import {View} from 'react-native';
import {dataApprovalListStyles} from '../../../styles';
import {GenericResponse} from 'verus-typescript-primitives';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import {buildDataPacketResponse} from '../../../utils/deeplink/dataPacket/signDataPacket';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {createRequestSessionGuard} from '../../../utils/deeplink/requestSessionGuard';
import {assertAuthenticationRequestsNotExpired} from '../../../utils/deeplink/validator/authenticationRequestValidator';
import useDataRequestIdentity from '../components/RequestReview/useDataRequestIdentity';
import useDataReviewConsent from '../components/RequestReview/useDataReviewConsent';
import DataRequestReview, {
  DataReviewNotice,
  DataReviewValue,
} from '../components/RequestReview/DataRequestReview';

const readableValue = item => {
  const json =
    item.descriptorVersion != null ? item.objectDataJson : item.signedJson;
  if (json != null) {
    try {
      return JSON.parse(json);
    } catch (_) {}
  }
  return item.descriptorVersion != null ? item.objectDataText : item.signedText;
};

const packetDetails = item => [
  {
    label: 'SHA-256 of signed bytes',
    value: item.sha256,
    technical: true,
    copy: true,
  },
  {
    label: 'Signed bytes (hex)',
    value: item.signedBytesHex,
    technical: true,
    copy: true,
  },
  {
    label: 'Signed size',
    value: item.size != null ? `${item.size} bytes` : null,
  },
  {label: 'Descriptor version', value: item.descriptorVersion},
  {label: 'Descriptor flags', value: item.descriptorFlags},
  {label: 'Descriptor label', value: item.descriptorLabel},
  {label: 'MIME type', value: item.descriptorMimeType},
  {
    label: 'Object bytes (hex)',
    value: item.objectDataBytesHex,
    technical: true,
    copy: true,
  },
  {label: 'Full descriptor', value: item.descriptorJson},
];

const DataPacketRequestInfoContent = props => {
  const {
    statements = [],
    signableObjectSummaries = [],
    request,
    response,
    detailIndex,
    next,
  } = props;
  const theme = useOnboardingTheme();
  const approvalStyles = useMemo(() => dataApprovalListStyles(theme), [theme]);
  const identity = useDataRequestIdentity(props);
  const [processing, setProcessing] = useState(false);
  useRequestBackHandler(props.cancel, processing);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const payloadKey = JSON.stringify([statements, signableObjectSummaries]);
  const context = useMemo(
    () => ({}),
    [identity.context, identity.selectedIdentity?.iAddress, payloadKey],
  );
  const currentContext = useRef(context);
  currentContext.current = context;
  useEffect(
    () => () => {
      currentContext.current = null;
    },
    [],
  );
  const consent = useDataReviewConsent(context);
  const reviewComplete =
    signableObjectSummaries.length > 0 &&
    signableObjectSummaries.every(
      (_, index) => consent.checked[`data-${index}`],
    ) &&
    statements.every((_, index) => consent.checked[`statement-${index}`]);

  const approvalItems = [
    ...statements.map((statement, index) => ({
      key: `statement-${index}`,
      title: statements.length === 1 ? 'Statement' : `Statement ${index + 1}`,
      content: <DataReviewValue value={statement} />,
    })),
    ...signableObjectSummaries.map((item, index) => {
      const value = readableValue(item);
      const unreadable = value == null || value === '';
      const bytes = item.objectDataBytesHex ?? item.signedBytesHex ?? '';
      return {
        key: `data-${index}`,
        title: unreadable
          ? 'Unreadable data'
          : item.descriptorLabel || (item.type === 'Message' ? 'Message' : 'Data item'),
        details: packetDetails(item),
        unreadable,
        bytes,
        descriptorLabel: item.descriptorLabel,
        content: unreadable ? (
          <View>
            <Text selectable style={approvalStyles.bytes}>
              {bytes}
            </Text>
            <Text style={approvalStyles.size}>{`${item.size || 0} bytes`}</Text>
          </View>
        ) : (
          <>
            <DataReviewValue value={value} />
            {item.descriptorVersion != null ? (
              <View style={approvalStyles.itemNotice}>
                <DataReviewNotice title="Includes descriptor metadata">
                  Your signature covers this content and its descriptor. Both
                  are available in details.
                </DataReviewNotice>
              </View>
            ) : null}
          </>
        ),
      };
    }),
  ];

  const handleContinue = async () => {
    if (
      inFlight.current ||
      !identity.walletReady ||
      !identity.selectedIdentity ||
      !reviewComplete ||
      identity.signerConflict
    )
      return;
    inFlight.current = true;
    setProcessing(true);
    setError(null);
    try {
      const updatedResponse = new GenericResponse();
      if (response?.details?.length)
        updatedResponse.fromBuffer(response.toBuffer(), 0);
      else if (response)
        Object.assign(updatedResponse, response, {details: []});
      ensureGenericResponseSigner({
        response: updatedResponse,
        systemID: identity.coinObj.system_id,
        identityID: identity.selectedIdentity.iAddress,
      });
      const sessionGuard = createRequestSessionGuard(() => {
        if (currentContext.current !== context)
          throw new Error('Review changed');
        assertAuthenticationRequestsNotExpired(request);
      }, identity.sessionScope);
      sessionGuard.assertCurrent();
      const responseDetail = await buildDataPacketResponse({
        coinObj: identity.coinObj,
        identityAddress: identity.selectedIdentity.iAddress,
        dataPacketDetail: request.getDetails(detailIndex).data,
        assertReviewCurrent: sessionGuard.assertCurrent,
        sessionScope: sessionGuard.sessionScope,
      });
      sessionGuard.assertCurrent();
      updatedResponse.details = [
        ...(updatedResponse.details || []),
        responseDetail,
      ];
      updatedResponse.setFlags();
      await next(updatedResponse, [detailIndex], {
        autoDeliverOnComplete: true,
        dataPacketSigned: true,
        responseIdentityName: identity.selectedIdentity.friendlyName,
      });
    } catch (_) {
      inFlight.current = false;
      setProcessing(false);
      setError(
        'Unable to sign this data. Check your VerusID and connection, then try again.',
      );
    }
  };

  return (
    <DataRequestReview
      requestAction={`wants you to sign ${statements.length + signableObjectSummaries.length} ${statements.length + signableObjectSummaries.length === 1 ? 'item' : 'items'}`}
      responseCaption={host => `The wallet sends the signatures to ${host}.`}
      props={props}
      identity={identity}
      onContinue={handleContinue}
      primaryLabel="Sign data"
      disabled={
        signableObjectSummaries.length === 0 &&
        !approvalItems.some(item => !consent.checked[item.key])
      }
      approvalItems={approvalItems}
      consent={consent}
      processing={processing}
      error={error}
    />
  );
};

export default function DataPacketRequestInfo(props) {
  return (
    <OnboardingThemeProvider>
      <DataPacketRequestInfoContent
        key={`${props.detailIndex}:${props.detailsBufferString}`}
        {...props}
      />
    </OnboardingThemeProvider>
  );
}
