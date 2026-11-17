import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NavigationContext} from '@react-navigation/native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {check, openSettings, PERMISSIONS, request, RESULTS} from 'react-native-permissions';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../AppButton';
import SafeBottomActionStack from '../SafeBottomActionStack';
import {barcodeReaderStyles as createStyles} from '../../styles';
import {
  SCANNER_CONTROL_FILL,
  SCANNER_FRAME_CORNER,
  SCANNER_FRAME_RADIUS,
  SCANNER_FRAME_SIZE,
  SCANNER_FRAME_STROKE,
  SCANNER_READ_COLOR,
  SCANNER_VEIL,
} from '../../styles/components/barcodeReader.styles';
import {useAppTheme} from '../../theme/app';
import {triggerHapticSuccess} from '../../utils/haptics/haptics';

const CAMERA_PERMISSION =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

const CAMERA = {
  CHECKING: 'checking',
  READY: 'ready',
  // Android can still show its own prompt; iOS reports a refusal as blocked.
  DENIED: 'denied',
  BLOCKED: 'blocked',
};

const toCameraState = result => {
  if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) return CAMERA.READY;
  if (result === RESULTS.BLOCKED || result === RESULTS.UNAVAILABLE) return CAMERA.BLOCKED;
  return CAMERA.DENIED;
};

// Outside a navigator (for example in a modal) the scanner counts as focused.
const useScreenFocused = () => {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() =>
    navigation?.isFocused ? navigation.isFocused() : true,
  );

  useEffect(() => {
    if (!navigation?.addListener) return undefined;
    const removeFocus = navigation.addListener('focus', () => setFocused(true));
    const removeBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      removeFocus();
      removeBlur();
    };
  }, [navigation]);

  return focused;
};

const useAppActive = () => {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next =>
      setActive(next === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return active;
};

// The dimmed camera around a rounded frame, with four corner marks.
const Viewfinder = ({height, read, width}) => {
  const size = Math.min(SCANNER_FRAME_SIZE, width - 64, height - 128);
  if (!(size > 0)) return null;

  const r = SCANNER_FRAME_RADIUS;
  const l = SCANNER_FRAME_CORNER;
  const x = (width - size) / 2;
  const y = (height - size) / 2;
  const right = x + size;
  const bottom = y + size;
  const hole =
    `M${x + r} ${y}H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}` +
    `V${bottom - r}A${r} ${r} 0 0 1 ${right - r} ${bottom}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const corners = [
    `M${x} ${y + l}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + l}`,
    `M${right - l} ${y}H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}V${y + l}`,
    `M${right} ${bottom - l}V${bottom - r}A${r} ${r} 0 0 1 ${right - r} ${bottom}H${right - l}`,
    `M${x + l} ${bottom}H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}V${bottom - l}`,
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height={height} width={width}>
        <Path d={`M0 0H${width}V${height}H0Z${hole}`} fill={SCANNER_VEIL} fillRule="evenodd" />
        {corners.map(d => (
          <Path
            d={d}
            fill="none"
            key={d}
            stroke={read ? SCANNER_READ_COLOR : '#FFFFFF'}
            strokeLinecap="round"
            strokeWidth={SCANNER_FRAME_STROKE}
          />
        ))}
      </Svg>
    </View>
  );
};

// A QR scanner drawn as a rounded camera window inside the page. The caller
// draws the page title or header; this draws the window and the actions below
// it. actions: [{label, onPress, variant}] show in every state.
// noCameraAction: {label, onPress} shows only when the device has no camera.
const BarcodeReader = ({
  actions = [],
  active = true,
  busy = false,
  children,
  horizontalInset = 20,
  includeBottomInset = true,
  noCameraAction,
  noCameraHint,
  onScan,
  style,
  testID,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  const focused = useScreenFocused();
  const appActive = useAppActive();
  const [permission, setPermission] = useState(CAMERA.CHECKING);
  const [reading, setReading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [layout, setLayout] = useState(null);
  const mounted = useRef(true);
  const readingRef = useRef(false);
  const acceptRef = useRef(false);
  const requestingRef = useRef(false);

  const hasCamera = device != null;
  const cameraLive =
    hasCamera && permission === CAMERA.READY && active && focused && appActive;
  const showReading = reading || busy;
  acceptRef.current = cameraLive && !busy;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const updatePermission = useCallback(async ask => {
    try {
      let result = await check(CAMERA_PERMISSION);
      if (result === RESULTS.DENIED && ask) {
        requestingRef.current = true;
        try {
          result = await request(CAMERA_PERMISSION);
        } finally {
          requestingRef.current = false;
        }
      }
      if (!mounted.current) return;
      const next = toCameraState(result);
      // Android's check() reports a blocked camera as denied, so a check
      // without a request only moves the scanner to ready.
      setPermission(current => (ask || next === CAMERA.READY ? next : current));
    } catch (error) {
      if (mounted.current) setPermission(CAMERA.BLOCKED);
    }
  }, []);

  // Ask once when the scanner opens, as before. The system prompt shows over
  // the dark window, so no permission page flashes first.
  useEffect(() => {
    if (hasCamera) updatePermission(true);
  }, [hasCamera, updatePermission]);

  // Back from Settings: read the permission again. The system prompt also
  // pauses the app, so skip the check while a request is open.
  useEffect(() => {
    if (
      appActive &&
      !requestingRef.current &&
      (permission === CAMERA.DENIED || permission === CAMERA.BLOCKED)
    ) {
      updatePermission(false);
    }
  }, [appActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cameraLive) setTorchOn(false);
  }, [cameraLive]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async codes => {
      if (!acceptRef.current || readingRef.current) return;
      readingRef.current = true;
      setReading(true);
      triggerHapticSuccess();

      try {
        if (onScan != null) await onScan(codes);
      } finally {
        readingRef.current = false;
        if (mounted.current) setReading(false);
      }
    },
  });

  const onWindowLayout = event => {
    const {width, height} = event.nativeEvent.layout;
    setLayout(current =>
      current?.width === width && current?.height === height ? current : {width, height},
    );
  };

  const renderOffState = ({icon, title, detail, symbolColor, symbolBackground}) => (
    <View style={[styles.window, styles.windowOff]}>
      <View style={[styles.symbol, {backgroundColor: symbolBackground}]}>
        <Feather color={symbolColor} name={icon} size={40} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );

  let windowContent;
  let stateAction = null;

  if (!hasCamera) {
    windowContent = renderOffState({
      icon: 'camera-off',
      title: 'No camera found',
      detail: noCameraHint,
      symbolColor: theme.colors.textSecondary,
      symbolBackground: 'transparent',
    });
  } else if (permission === CAMERA.DENIED || permission === CAMERA.BLOCKED) {
    const blocked = permission === CAMERA.BLOCKED;
    windowContent = renderOffState({
      icon: 'camera',
      title: 'Camera access is off',
      detail: blocked
        ? 'Turn it on in Settings to scan QR codes.'
        : 'Allow camera access to scan QR codes.',
      symbolColor: theme.colors.primary,
      symbolBackground: theme.colors.primaryBackground,
    });
    stateAction = blocked
      ? {label: 'Open Settings', onPress: openSettings}
      : {label: 'Allow camera', onPress: () => updatePermission(true)};
  } else {
    windowContent = (
      <View
        accessibilityLabel="Camera viewfinder"
        onLayout={onWindowLayout}
        style={styles.window}>
        {permission === CAMERA.READY ? (
          <Camera
            androidPreviewViewType="texture-view"
            codeScanner={codeScanner}
            device={device}
            isActive={cameraLive}
            style={StyleSheet.absoluteFill}
            torch={torchOn ? 'on' : 'off'}
          />
        ) : null}
        {permission === CAMERA.READY && layout ? (
          <Viewfinder height={layout.height} read={showReading} width={layout.width} />
        ) : null}
        {showReading ? (
          <View accessibilityLiveRegion="polite" style={styles.reading}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.readingText}>Reading code…</Text>
          </View>
        ) : null}
        {cameraLive && device.hasTorch ? (
          <Pressable
            accessibilityLabel="Flashlight"
            accessibilityRole="button"
            accessibilityState={{selected: torchOn}}
            hitSlop={4}
            onPress={() => setTorchOn(on => !on)}
            style={[
              styles.torch,
              {backgroundColor: torchOn ? '#FFFFFF' : SCANNER_CONTROL_FILL},
            ]}>
            <MaterialCommunityIcons
              color={torchOn ? theme.colors.textPrimary : '#FFFFFF'}
              name="flashlight"
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    );
  }

  const footer = [
    stateAction && {...stateAction, variant: 'primary'},
    ...actions,
    !hasCamera && noCameraAction && {...noCameraAction, variant: 'secondary'},
  ].filter(Boolean);
  const hasFooter = footer.length > 0 || children != null;
  const sideInsets = {
    paddingLeft: horizontalInset + insets.left,
    paddingRight: horizontalInset + insets.right,
  };
  const windowBottom = hasFooter
    ? 16
    : includeBottomInset
    ? Math.max(insets.bottom + 12, 28)
    : 16;

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={[styles.root, sideInsets, {paddingBottom: windowBottom}]}>
        {windowContent}
      </View>
      {hasFooter ? (
        <SafeBottomActionStack
          bottomSpacing={includeBottomInset ? 30 : 16}
          gap={10}
          horizontalSpacing={horizontalInset}
          includeBottomInset={includeBottomInset}
          safeAreaSpacing={includeBottomInset ? 12 : 16}>
          {footer.map(action => (
            <AppButton
              key={action.label}
              onPress={action.onPress}
              testID={action.testID}
              variant={action.variant || 'secondary'}>
              {action.label}
            </AppButton>
          ))}
          {children}
        </SafeBottomActionStack>
      ) : null}
    </View>
  );
};

export default BarcodeReader;
