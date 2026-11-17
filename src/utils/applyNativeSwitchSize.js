import {Platform, Switch} from 'react-native';

// React Native 0.77 lays out every iOS switch as 51 x 31 points. The iOS 26
// switch draws at 63 x 28 from the same origin, so it ran 12 points past the
// end of its row. The owner found that size too large (2026-10-21), so the
// switch is drawn at its earlier 51-point width. The negative margins shrink
// its layout box to the drawn size. A switch that sets its own size keeps it.
const IOS_26_WIDTH = 63;
const IOS_26_HEIGHT = 28;
const SCALE = 51 / IOS_26_WIDTH;
const IOS_26_SWITCH_STYLE = {
  width: IOS_26_WIDTH,
  height: IOS_26_HEIGHT,
  marginHorizontal: (-IOS_26_WIDTH * (1 - SCALE)) / 2,
  marginVertical: (-IOS_26_HEIGHT * (1 - SCALE)) / 2,
  transform: [{scale: SCALE}],
};

const applyNativeSwitchSize = () => {
  if (
    Platform.OS !== 'ios' ||
    parseInt(Platform.Version, 10) < 26 ||
    Switch.__verusSizePatched ||
    typeof Switch.render !== 'function'
  ) {
    return;
  }

  const originalRender = Switch.render;

  Switch.render = function renderWithNativeSize(props, ref) {
    return originalRender.call(
      this,
      {...props, style: [IOS_26_SWITCH_STYLE, props.style]},
      ref,
    );
  };

  Switch.__verusSizePatched = true;
};

export default applyNativeSwitchSize;
