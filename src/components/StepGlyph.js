import React from 'react';
import {View} from 'react-native';
import {
  GLYPH_STROKE_WIDTH,
  STEP_GLYPH_SIZE,
  stepGlyphStyles as styles,
} from '../styles';
import {useAppTheme} from '../theme/app';

// The Lucide glyph that leads an icon-led step, above its large title.
const StepGlyph = ({icon: Icon, style}) => {
  const theme = useAppTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.glyph, style]}>
      <Icon
        color={theme.colors.textPrimary}
        size={STEP_GLYPH_SIZE}
        strokeWidth={GLYPH_STROKE_WIDTH}
      />
    </View>
  );
};

export default StepGlyph;
