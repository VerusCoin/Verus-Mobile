import React, {useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Check, ChevronDown, ChevronRight} from 'lucide-react-native';
import {getButtonHitSlop, useButtonHeight} from '../../../../hooks/useButtonHeight';
import {useOnboardingSmallDeviceLayout} from '../../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {requestCardStyles as createStyles} from '../../../../styles';
import {
  getGenericRequestDeliveryInfo,
  getGenericRequestDeliveryLabel,
} from '../../../../utils/deeplink/genericRequestDelivery';
import {getSystemNameFromSystemId} from '../../../../utils/CoinData/CoinData';
import {unixToDate} from '../../../../utils/math';
import DeepLinkRequesterSheet from './DeepLinkRequesterSheet';
import RequestName from './RequestName';
import useRequestRequester from './useRequestRequester';

const RequestCard = ({
  action,
  caption,
  compact = false,
  requester = {},
  sections = [],
  responderName,
  responderWord = 'as',
  showResponder = false,
  onPressResponder,
  style,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const rowHeight = useButtonHeight('primary', compact ? 48 : 56);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [responderWraps, setResponderWraps] = useState(false);
  const source = useRequestRequester(requester);
  const request = requester.request;
  const delivery = getGenericRequestDeliveryInfo(request);
  const commonSections = [
    {
      title: 'Request',
      rows: [
        {
          label: 'Network',
          value: requester.signerSystemName ||
            (source.systemId ? getSystemNameFromSystemId(source.systemId) : null),
        },
        {
          label: 'Signed',
          value: requester.sigtime ? unixToDate(requester.sigtime) : null,
        },
        ...(request?.responseURIs || []).map((uri, index) => ({
          label: request.responseURIs.length > 1
            ? `Response URI ${index + 1}`
            : 'Response URI',
          value: uri.getUriString(),
          copy: true,
          valueStyle: styles.identifier,
        })),
        {label: 'Delivery', value: getGenericRequestDeliveryLabel(delivery)},
        {label: 'Request ID', value: request?.requestID?.toAddress?.()},
      ],
    },
    ...sections,
  ];
  const requesterLabel = source.verified ? source.name : 'Unsigned request';
  const ResponderRow = onPressResponder ? TouchableOpacity : View;
  const RequesterRow = source.verified ? TouchableOpacity : View;

  return (
    <View style={[styles.group, style]}>
      <View style={styles.card}>
        <RequesterRow
          accessible
          accessibilityLabel={source.verified
            ? `Request from ${requesterLabel}, verified`
            : 'Unsigned request'}
          accessibilityRole={source.verified ? 'button' : undefined}
          accessibilityHint={source.verified
            ? 'View requester and request details'
            : undefined}
          onPress={source.verified ? () => setDetailsVisible(true) : undefined}
          hitSlop={getButtonHitSlop(rowHeight)}
          style={[
            styles.requester,
            compact && styles.requesterCompact,
            smallDevice && styles.rowCompact,
            {minHeight: rowHeight},
          ]}>
          <Text style={[
            compact ? theme.typography.titleRow : theme.typography.titleSheet,
            styles.requesterText,
          ]}>
            {source.verified ? (
              <>
                <RequestName compact={compact} name={requesterLabel} />
                {'\u00a0'}
                <View accessible={false} style={styles.verified}>
                  <Check size={12} strokeWidth={3} color={theme.colors.onPrimary} />
                </View>
              </>
            ) : <Text style={styles.nameSecondary}>Unsigned request</Text>}
          </Text>
          {source.verified && (
            <ChevronRight size={22} color={theme.colors.textSecondary} />
          )}
        </RequesterRow>
        {compact ? (
          <View style={styles.compactActionRow}>
            <Text style={styles.compactAction}>{action}</Text>
            <View style={styles.chip}>
              <RequestName compact name={responderName} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.action}>{action}</Text>
            {showResponder && (
              <ResponderRow
                accessible
                accessibilityLabel={responderName
                  ? `Respond ${responderWord ? `${responderWord} ` : ''}${responderName}`
                  : 'No VerusID chosen'}
                accessibilityRole={onPressResponder ? 'button' : undefined}
                accessibilityHint={onPressResponder ? 'Open VerusID options' : undefined}
                onPress={onPressResponder}
                hitSlop={getButtonHitSlop(rowHeight)}
                style={[
                  styles.responder,
                  smallDevice && styles.rowCompact,
                  {minHeight: rowHeight},
                ]}>
                <View style={styles.responderText}>
                  {responderName ? (
                    <>
                      {!!responderWord && (
                        <Text style={[
                          styles.joiningWord,
                          responderWraps && styles.joiningWordWrapped,
                        ]}>{responderWord}</Text>
                      )}
                      <RequestName
                        name={responderName}
                        style={styles.name}
                        onTextLayout={event =>
                          setResponderWraps(event.nativeEvent.lines.length > 1)
                        }
                      />
                    </>
                  ) : <Text style={styles.placeholder}>No VerusID chosen</Text>}
                </View>
                {!!onPressResponder && (
                  <ChevronDown size={22} color={theme.colors.successText} />
                )}
              </ResponderRow>
            )}
          </>
        )}
      </View>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
      <DeepLinkRequesterSheet
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        requesterName={requesterLabel}
        requesterAddress={source.address}
        verified={source.verified}
        sections={commonSections}
        loadVerusId={requester.loadVerusId || source.loadVerusId}
        loadFriendlyNames={requester.loadFriendlyNames || source.loadFriendlyNames}
      />
    </View>
  );
};

export default RequestCard;
