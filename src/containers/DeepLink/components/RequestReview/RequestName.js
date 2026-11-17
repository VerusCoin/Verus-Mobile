import React from 'react';
import {Text} from 'react-native-paper';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {withNameBreaks} from '../../../../utils/fullyqualifiedname';

// Keep the complete name visible. A lookalike may differ only at its end.
const RequestName = ({name, compact = false, style, onTextLayout}) => {
  const theme = useOnboardingTheme();
  const value = String(name || '');
  const dot = value.indexOf('.');

  return (
    <Text onTextLayout={onTextLayout} style={[
      compact ? theme.typography.titleRow : theme.typography.titleSheet,
      style,
    ]}>
      <Text style={{color: theme.colors.textPrimary}}>
        {dot < 0 ? value : value.slice(0, dot)}
      </Text>
      {dot >= 0 && (
        <Text style={{color: theme.colors.textSecondary}}>
          {withNameBreaks(value.slice(dot))}
        </Text>
      )}
    </Text>
  );
};

export default RequestName;
