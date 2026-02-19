/*
  ReviewStep (Step 1)
  - 2026-02-05: Extracted from IdentityUpdateRequestInfo into its own component.
    Shows requester card, target identity, summary (split into high-risk vs content
    counts), and identity changes accordion with badges.
  - 2026-02-05: Trimmed to overview-only. Removed VerusIdObjectData accordion --
    content changes now live in their own dedicated ContentStep for more space.
*/
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import VerusIdAtIcon from '../../../../images/customIcons/verusid-at-icon.svg';

const Connector = () => (
  <View style={connectorStyles.container}>
    <View style={connectorStyles.line} />
    <View style={connectorStyles.arrow} />
  </View>
);

const ReviewStep = ({
  signerFqn,
  canOpenSignerModal,
  chainId,
  sigDateString,
  expiryLabel,
  details,
  fullyqualifiedname,
  highRiskCount,
  contentCount,
  openVerusIdDetailsModal,
  signerIdentityID,
  styles,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Update request</Text>
        <Text style={styles.subtitle}>Review the requested changes to your identity</Text>
      </View>

      {/* Requester Card */}
      {signerFqn ? (
        <TouchableOpacity
          style={styles.requesterCard}
          onPress={canOpenSignerModal ? () => openVerusIdDetailsModal(chainId, signerIdentityID) : undefined}
          activeOpacity={canOpenSignerModal ? 0.7 : 1}
        >
          <View style={styles.requesterHeaderRow}>
            <View style={styles.requesterIconContainer}>
              <MaterialCommunityIcons name="shield-check" size={28} color={Colors.verusGreenColor} />
            </View>
            <View style={styles.requesterTextContainer}>
              <Text style={styles.requesterLabel}>Request from</Text>
              <Text style={styles.requesterName}>{signerFqn}</Text>
            </View>
            {canOpenSignerModal && (
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.verusDarkGray} />
            )}
          </View>
          <View style={styles.requesterDetailsRow}>
            <View style={styles.chipContainer}>
              <Text style={styles.chipText}>{chainId}</Text>
            </View>
            <View style={styles.chipContainer}>
              <Text style={styles.chipText}>{sigDateString}</Text>
            </View>
            {details.expires() && (
              <View style={[styles.chipContainer, styles.expiryChip]}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.infoButtonColor} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, { color: Colors.infoButtonColor }]}>{expiryLabel}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.unsignedCard}>
          <View style={styles.requesterIconContainer}>
            <MaterialCommunityIcons name="shield-alert-outline" size={28} color={Colors.infoButtonColor} />
          </View>
          <View style={styles.requesterInfo}>
            <Text style={[styles.requesterLabel, { color: Colors.infoButtonColor }]}>Unsigned Request</Text>
            <Text style={styles.unsignedText}>
              This request was not cryptographically signed.
            </Text>
          </View>
        </View>
      )}

      <Connector />

      {/* Target Identity Card */}
      <View style={styles.targetCard}>
        <View style={styles.targetRow}>
          <View style={styles.targetIconContainer}>
            <VerusIdAtIcon width={24} height={24} fill="#3165D4" />
          </View>
          <View style={styles.targetInfo}>
            <Text style={styles.targetLabel}>Updating identity</Text>
            <Text style={styles.targetName}>{fullyqualifiedname}</Text>
          </View>
        </View>
      </View>

      {/* Summary Card -- split into high-risk vs content */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          {highRiskCount > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: Colors.warningButtonColor }]}>{highRiskCount}</Text>
              <Text style={styles.summaryLabel}>High-risk</Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryCount}>{contentCount}</Text>
            <Text style={styles.summaryLabel}>{contentCount === 1 ? 'Content change' : 'Content changes'}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const connectorStyles = {
  container: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  line: {
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
    position: 'absolute',
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
  },
};

export default ReviewStep;
