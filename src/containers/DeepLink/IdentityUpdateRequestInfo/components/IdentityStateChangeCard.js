import React, {useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import InfoSheet from '../../../../components/InfoSheet';
import {highRiskStepStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const IdentityStateChangeCard = ({change, detailed = false}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => highRiskStepStyles(theme), [theme]);
  const [showDetails, setShowDetails] = useState(false);
  if (!change) return null;

  const states = [['Current', change.before], ['After update', change.after]];
  return (
    <View style={styles.summaryPanel}>
      <Text style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>
        {change.title}
      </Text>
      <Text style={styles.sheetCopy}>{change.warning}</Text>
      {states.map(([label, state]) => (
        <View key={label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.sheetRowTitle}>{state.status}</Text>
          {detailed && (
            <Text style={styles.sheetRowCopy}>Timelock: {state.timelock}</Text>
          )}
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => setShowDetails(true)}
        style={styles.changeRow}>
        <Text style={styles.changeView}>View state details</Text>
      </TouchableOpacity>
      <InfoSheet
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        title={change.title}>
        {states.map(([label, state]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.sheetRowTitle}>{state.status}</Text>
            <Text selectable style={styles.sheetRowCopy}>Flags: {state.flags}</Text>
            <Text selectable style={styles.sheetRowCopy}>Timelock: {state.timelock}</Text>
          </View>
        ))}
        {change.lockExplanation ? (
          <Text style={styles.sheetCopy}>{change.lockExplanation}</Text>
        ) : null}
      </InfoSheet>
    </View>
  );
};

export default IdentityStateChangeCard;
