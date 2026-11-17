import React from 'react';
import {PixelRatio, Platform, StyleSheet, Text, View} from 'react-native';
import {normalizeWalletAvatar} from '../utils/walletAvatar';

// iOS draws the wallet emoji with their ink about 9% of the font size above
// the center of the text line, so they look high in the circle. Measured for
// every wallet icon at 16-48 pt on the iOS 26 simulator.
const EMOJI_DROP_RATIO = Platform.OS === 'ios' ? 0.09 : 0;

export const WalletAvatarEmoji = ({emoji, emojiSize}) => (
  <Text
    allowFontScaling={false}
    style={[
      styles.emoji,
      {
        fontSize: emojiSize,
        lineHeight: emojiSize + 4,
        top: PixelRatio.roundToNearestPixel(emojiSize * EMOJI_DROP_RATIO),
      },
    ]}>
    {emoji}
  </Text>
);

const WalletAvatar = ({walletAvatar, size = 40, emojiSize = 21, style}) => {
  const normalizedAvatar = normalizeWalletAvatar(walletAvatar);

  if (normalizedAvatar == null) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: normalizedAvatar.backgroundColor,
        },
        style,
      ]}>
      <WalletAvatarEmoji
        emoji={normalizedAvatar.emoji}
        emojiSize={emojiSize}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    // Android draws color emoji with the alpha of the text color, and its
    // default text color is partly transparent.
    color: '#000000',
    textAlign: 'center',
  },
});

export default WalletAvatar;
