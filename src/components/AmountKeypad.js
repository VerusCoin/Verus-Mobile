import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {Delete} from 'lucide-react-native';
import {useOnboardingSmallDeviceLayout} from '../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../theme/onboarding';
import {createAmountKeypadStyles} from '../styles';
import SafeBottomActionStack from './SafeBottomActionStack';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['decimal', '0', 'delete']];

const AmountKeypad = ({decimalSeparator = '.', onKeyPress, visible = true}) => {
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const compactKeys = smallDevice && Platform.OS === 'ios';
  const styles = useMemo(() => createAmountKeypadStyles(theme), [theme]);
  const repeatRef = useRef(null);
  const onKeyRef = useRef(onKeyPress);
  onKeyRef.current = onKeyPress;
  const stopRepeat = useCallback(() => {
    clearInterval(repeatRef.current);
    repeatRef.current = null;
  }, []);

  useEffect(() => {
    if (!visible) stopRepeat();
    return stopRepeat;
  }, [stopRepeat, visible]);

  return (
    <SafeBottomActionStack
      bottomSpacing={smallDevice ? 8 : 16}
      horizontalSpacing={16}
      safeAreaSpacing={0}
      style={!visible && styles.hidden}>
      <View
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.grid, smallDevice && styles.gridCompact, compactKeys && styles.gridCompactIos]}>
        {ROWS.map((row, index) => (
          <View key={index} style={[styles.row, smallDevice && styles.rowCompact]}>
            {row.map(key => (
              <Pressable
                key={key}
                accessibilityLabel={key === 'delete' ? 'Delete digit' : key === 'decimal' ? 'Decimal separator' : key}
                accessibilityRole="button"
                delayLongPress={350}
                onLongPress={key === 'delete' ? () => {
                  onKeyRef.current('delete');
                  repeatRef.current = setInterval(() => onKeyRef.current('delete'), 75);
                } : undefined}
                onPress={() => onKeyRef.current(key)}
                onPressOut={stopRepeat}
                style={styles.touch}>
                {({pressed}) => (
                  <View style={[
                    styles.key,
                    compactKeys && styles.keyCompact,
                    (key === 'delete' || key === 'decimal') && styles.plain,
                    pressed && styles.pressed,
                  ]}>
                    {key === 'delete' ? (
                      <Delete color={theme.colors.textPrimary} size={28} strokeWidth={1.8} />
                    ) : (
                      <Text style={[styles.label, compactKeys && styles.labelCompact]}>
                        {key === 'decimal' ? decimalSeparator : key}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </SafeBottomActionStack>
  );
};

export default AmountKeypad;
