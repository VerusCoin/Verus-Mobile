import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold from './RevokeRecoverFlowScaffold';
import RevokeRecoverAuthoritySheet from './RevokeRecoverAuthoritySheet';

const ACTIONS = [
  {
    key: 'revoke',
    title: 'Revoke a VerusID',
    body: 'Disable an active identity after its keys may have been lost or compromised.',
  },
  {
    key: 'recover',
    title: 'Recover a VerusID',
    body: 'Restore a revoked identity and assign a new primary address.',
  },
];

const RevokeRecoverSlider = ({
  navigation,
  onSelectImportMethod,
  setImportedSeed,
  setIsRecovery,
}) => {
  const theme = useAppTheme();
  const [selection, setSelection] = useState(null);
  const [authoritySheetVisible, setAuthoritySheetVisible] = useState(false);
  const chooseAction = key => {
    setSelection(key);
    setImportedSeed(null);
    setIsRecovery(key === 'recover');
    setAuthoritySheetVisible(true);
  };

  return (
    <RevokeRecoverFlowScaffold
      contentContainerStyle={{paddingTop: 24}}
      headerTitle="Choose action"
      onBack={() => navigation.goBack()}
      progress={0.15}
      overlayVisible={authoritySheetVisible}
      overlay={
        <RevokeRecoverAuthoritySheet
          isRecovery={selection === 'recover'}
          onClose={() => setAuthoritySheetVisible(false)}
          onSelectMethod={onSelectImportMethod}
          visible={authoritySheetVisible}
        />
      }>
      <View style={styles.choiceGroup}>
        {ACTIONS.map(action => {
          const selected = selection === action.key;
          return (
            <TouchableOpacity
              key={action.key}
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => chooseAction(action.key)}
              style={[
                styles.choiceRow,
                {
                  backgroundColor: selected
                    ? theme.colors.surfaceMuted
                    : theme.colors.background,
                },
              ]}
              testID={`revokeRecover.action.${action.key}`}>
              <View style={styles.choiceCopy}>
                <Text
                  style={[
                    theme.typography.titleRow,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.choiceBody,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {action.body}
                </Text>
              </View>
              {selected ? (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={23}
                  color={
                    theme.isDark
                      ? theme.colors.textPrimary
                      : theme.colors.primary
                  }
                />
              ) : (
                <ChevronRight size={23} color={theme.colors.textSubtle} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </RevokeRecoverFlowScaffold>
  );
};

export default RevokeRecoverSlider;
