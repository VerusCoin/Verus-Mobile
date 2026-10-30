import React from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {reviewStepStyles as localStyles} from '../../../../styles';
import IdentityStateChangeCard from '../components/IdentityStateChangeCard';

// Keep the request context compact so the proposed content is the main task.
const ReviewStep = ({
  signerFqn,
  canOpenSignerModal,
  chainId,
  sigDateString,
  expiryLabel,
  details,
  fullyqualifiedname,
  highRiskCount,
  identityStateChange,
  openVerusIdDetailsModal,
  signerIdentityID,
  styles,
  children,
}) => (
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator
  >
    <View style={styles.header}>
      <Text allowFontScaling accessibilityRole="header" style={styles.mainTitle}>Review identity update</Text>
      <Text allowFontScaling selectable style={localStyles.identityName}>{fullyqualifiedname}</Text>
    </View>

    <View style={localStyles.requestContext}>
      {signerFqn ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View requester ${signerFqn}`}
          disabled={!canOpenSignerModal}
          onPress={() => openVerusIdDetailsModal(chainId, signerIdentityID)}
          style={localStyles.requester}
        >
          <View style={localStyles.requesterText}>
            <Text allowFontScaling style={styles.subtitle}>Request from</Text>
            <Text allowFontScaling style={localStyles.requesterName}>{signerFqn}</Text>
          </View>
          {canOpenSignerModal && <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.primaryColor} />}
        </TouchableOpacity>
      ) : (
        <View style={localStyles.unsignedRequest}>
          <MaterialCommunityIcons name="shield-alert-outline" size={22} color={Colors.infoButtonColor} />
          <View style={localStyles.requesterText}>
            <Text allowFontScaling style={localStyles.requesterName}>Unsigned request</Text>
            <Text allowFontScaling style={styles.subtitle}>The sender of this request has not been verified.</Text>
          </View>
        </View>
      )}
      <Text allowFontScaling style={localStyles.requestMetadata}>
        {[chainId, sigDateString, details.expires() ? `Expires in ${expiryLabel}` : null].filter(Boolean).join(' · ')}
      </Text>
    </View>

    {children}

    <IdentityStateChangeCard change={identityStateChange} />
    {highRiskCount > 0 && (
      <View style={localStyles.controlsNotice}>
        <Text allowFontScaling accessibilityRole="header" style={localStyles.requesterName}>Also review sensitive changes</Text>
        <Text allowFontScaling style={styles.subtitle}>
          {highRiskCount} {highRiskCount === 1 ? 'change requires' : 'changes require'} your acknowledgement on the next screen.
        </Text>
      </View>
    )}
    <Text allowFontScaling style={localStyles.continueNote}>Continuing does not update your identity. You’ll confirm the update and fee before signing.</Text>
    <View style={localStyles.bottomSpacer} />
  </ScrollView>
);

export default ReviewStep;
