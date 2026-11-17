import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HeaderContextBand from '../../../components/HeaderContextBand';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {useSendWizard} from '../SendWizardContext';
import {getWizardContextSummary} from '../wizardUtils';
import {WIZARD_CONTENT_INSET} from './WizardUI';

const LOGO_SIZE = 16;
const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

const Entity = ({coinId, iconId, label, showBadge = true, tone}) => {
  const theme = useOnboardingTheme();
  const logoId = coinId || iconId;

  return (
    <View style={styles.entity}>
      {logoId ? (
        <View style={styles.logo}>
          <AssetCoinLogo
            coinId={logoId}
            showBadge={showBadge}
            size={LOGO_SIZE}
            badgeRingColor={theme.colors.surfaceMuted}
          />
        </View>
      ) : null}
      <Text
        ellipsizeMode="tail"
        numberOfLines={1}
        style={[
          theme.typography.labelSm,
          styles.label,
          {color: tone === 'quiet' ? theme.colors.textSecondary : theme.colors.textPrimary},
          tone === 'quiet' && styles.quietLabel,
        ]}>
        {label}
      </Text>
    </View>
  );
};

// A slim band under the wizard header: the asset that moves on the left and,
// when it matters, the chain on the right. The gap between them gives way
// first, then the chain name, then the asset names.
const WizardContextBand = ({step}) => {
  const theme = useOnboardingTheme();
  const {mode, state} = useSendWizard();
  const summary = getWizardContextSummary({
    mode,
    step,
    sourceCoin: state.sourceCoin,
    target: state.target,
    route: state.route,
    channel: state.channel,
    recipient: state.scanRequest?.address,
    sourceIdentityName: state.sourceIdentity?.name,
  });

  if (!summary) return null;

  const {
    source,
    destination,
    chain,
    recipient,
    recipientOnly,
    recipientPrefix,
    recipientIsName,
  } = summary;
  // A VerusID name is in normal type; an address is monospace.
  const recipientText = (
    <Text
      ellipsizeMode="middle"
      numberOfLines={1}
      style={[
        recipientIsName
          ? [theme.typography.labelSm, styles.label]
          : styles.address,
        {color: theme.colors.textPrimary},
      ]}>
      {recipient}
    </Text>
  );

  return (
    <HeaderContextBand
      accessibilityLabel={summary.description}
      inset={WIZARD_CONTENT_INSET}>
      {recipientOnly ? (
        <View style={styles.route}>
          <Text
            style={[
              theme.typography.caption,
              styles.on,
              {color: theme.colors.textSecondary},
            ]}>
            {recipientPrefix || 'To'}
          </Text>
          {recipientText}
        </View>
      ) : (
        <View style={styles.route}>
          <Entity {...source} />
          {destination ? (
            <>
              <MaterialCommunityIcons
                color={theme.colors.textSubtle}
                name="arrow-right"
                size={14}
                style={styles.arrow}
              />
              <Entity
                {...destination}
                coinId={destination.kind === 'coin' ? destination.coinId : null}
                iconId={destination.kind === 'chain' ? destination.iconId : null}
              />
            </>
          ) : null}
        </View>
      )}
      {recipient && !recipientOnly ? (
        <View style={styles.chain}>
          <Text
            style={[
              theme.typography.caption,
              styles.on,
              {color: theme.colors.textSecondary},
            ]}>
            to
          </Text>
          {recipientText}
        </View>
      ) : null}
      {chain ? (
        <View style={styles.chain}>
          <Text
            style={[
              theme.typography.caption,
              styles.on,
              {color: theme.colors.textSecondary},
            ]}>
            on
          </Text>
          <Entity {...chain} showBadge={false} tone="quiet" />
        </View>
      ) : null}
    </HeaderContextBand>
  );
};

const styles = StyleSheet.create({
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  chain: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 200,
    marginLeft: 12,
  },
  entity: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logo: {
    marginRight: 6,
  },
  label: {
    flexShrink: 1,
  },
  quietLabel: {
    ...fontStyle('regular'),
  },
  arrow: {
    marginHorizontal: 6,
  },
  on: {
    marginRight: 6,
  },
  address: {
    flexShrink: 1,
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default WizardContextBand;
