import React from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {highRiskStepStyles as styles} from '../../../../styles';

const IdentityStateChangeCard = ({change, detailed = false}) => {
  if (!change) return null;

  return (
    <View style={styles.outcomeCard}>
      <Text style={styles.outcomeTitle}>{change.title}</Text>
      <Text style={styles.outcomeDesc}>{change.warning}</Text>

      <View style={styles.detailsSectionBorder}>
        {[
          ['Current', change.before],
          ['After update', change.after],
        ].map(([label, state]) => (
          <View key={label} style={styles.valueBlock}>
            <Text style={styles.valueLabel}>{label}</Text>
            <Text style={styles.outcomeTitle}>{state.status}</Text>
            <Text style={styles.outcomeDesc}>Flags: {state.flags}</Text>
            <Text style={styles.outcomeDesc}>Timelock: {state.timelock}</Text>
          </View>
        ))}
      </View>

      {detailed && change.lockExplanation && (
        <View style={styles.detailsSectionBorder}>
          <Text style={styles.detailsSectionTitle}>How identity locking works</Text>
          <Text style={styles.outcomeDesc}>{change.lockExplanation}</Text>
        </View>
      )}
    </View>
  );
};

export default IdentityStateChangeCard;
