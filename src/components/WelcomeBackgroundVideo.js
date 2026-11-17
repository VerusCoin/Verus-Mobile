import React from 'react';
import {StyleSheet, View} from 'react-native';
import Video from 'react-native-video';
import {useIsFocused} from '@react-navigation/native';
import {useOnboardingTheme} from '../theme/onboarding';

const welcomeWavesBackground = require('../../assets/videos/verus-waves-blur-slower-smooth.mp4');

const WelcomeBackgroundVideo = ({paused = false}) => {
  const theme = useOnboardingTheme();
  const isFocused = useIsFocused();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {backgroundColor: theme.colors.backgroundVideo},
      ]}>
      <Video
        source={welcomeWavesBackground}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        repeat
        muted
        paused={paused || !isFocused}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="obey"
        disableFocus
      />
      <View style={[styles.veil, {backgroundColor: theme.colors.videoVeil}]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
});

export default WelcomeBackgroundVideo;
