import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

// Still pictures are Lucide line glyphs with one stroke weight. A step glyph
// leads an icon-led step in the text color; an empty-state glyph sits above
// the title of an empty or failed list in the subtle color.
export const GLYPH_STROKE_WIDTH = 1.8;
export const STEP_GLYPH_SIZE = 72;
export const EMPTY_STATE_GLYPH_SIZE = 64;

const createEmptyStateStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 32,
    },
    glyph: {
      marginBottom: 24,
    },
    title: {
      textAlign: 'center',
    },
    message: {
      marginTop: 8,
      ...fontStyle('regular'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    action: {
      width: 240,
      marginTop: 32,
    },
  });

export const stepGlyphStyles = StyleSheet.create({
  glyph: {
    marginBottom: 24,
  },
});

export default createEmptyStateStyles;
