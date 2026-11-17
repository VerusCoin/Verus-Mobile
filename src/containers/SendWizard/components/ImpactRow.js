import React from 'react';
import {StyleSheet, Text} from 'react-native';
import StatusBadge from '../../../components/StatusBadge';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {formatImpact, IMPACT_LEVEL} from '../priceImpact';
import {getImpactBadgeLabel, getImpactTone} from './impactFormat';
import {FlatRow} from './WizardUI';

// The Confirm row for price impact: what it costs in money when it matters,
// then the badge. "Details" stands in for an unknown impact, as on Amount.
// `onPress` opens "Price and route", where the route shows.
const ImpactRow = ({impact, level, lossText, onPress, pay = false}) => {
  const theme = useOnboardingTheme();
  const showLoss =
    lossText != null &&
    (level === IMPACT_LEVEL.WARNING || level === IMPACT_LEVEL.DANGER);

  return (
    <FlatRow
      accessibilityLabel={`Price impact ${impact == null ? 'Details' : getImpactBadgeLabel(impact)}. Opens price and route`}
      copyValue={
        impact == null
          ? undefined
          : impact.isLessThanOrEqualTo(0)
          ? '0'
          : formatImpact(impact)
      }
      label="Price impact"
      onPress={onPress}>
      {showLoss ? (
        <Text
          style={[
            theme.typography.labelMd,
            styles.loss,
            {
              color:
                level === IMPACT_LEVEL.DANGER
                  ? theme.colors.danger
                  : theme.colors.textPrimary,
            },
          ]}>
          {lossText}
        </Text>
      ) : null}
      <StatusBadge
        label={impact == null ? 'Details' : getImpactBadgeLabel(impact, pay)}
        tone={getImpactTone(level)}
      />
    </FlatRow>
  );
};

const styles = StyleSheet.create({
  loss: {marginRight: 8},
});

export default ImpactRow;
