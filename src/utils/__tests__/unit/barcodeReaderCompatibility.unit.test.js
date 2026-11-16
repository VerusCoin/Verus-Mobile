jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn(() => ({id: 'back-camera', position: 'back'})),
  // Keep the upgraded scanner hook real; only the native camera is replaced.
  useCodeScanner: jest.requireActual('react-native-vision-camera/src/hooks/useCodeScanner').useCodeScanner,
}));
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  openSettings: jest.fn(),
  RESULTS: {GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked'},
  PERMISSIONS: {IOS: {CAMERA: 'ios.camera'}, ANDROID: {CAMERA: 'android.camera'}},
}));
jest.mock('react-native-paper', () => ({Text: 'Text', Button: 'Button'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../haptics/haptics', () => ({triggerHapticSuccess: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {AppState, Platform} = require('react-native');
const {check, request, openSettings, RESULTS, PERMISSIONS} = require('react-native-permissions');
const {triggerHapticSuccess} = require('../../haptics/haptics');
// The reader picks its permission once, when its module loads.
Platform.OS = 'android';
const BarcodeReader = require('../../../components/BarcodeReader/BarcodeReader').default;

describe('QR camera on VisionCamera 4', () => {
  let renderer;
  let changeAppState;
  let removeAppStateListener;
  let previousPlatform;
  let previousAppState;

  beforeEach(() => {
    jest.clearAllMocks();
    previousPlatform = Platform.OS;
    previousAppState = AppState.currentState;
    Platform.OS = 'android';
    AppState.currentState = 'active';
    check.mockResolvedValue(RESULTS.GRANTED);
    request.mockResolvedValue(RESULTS.GRANTED);
    removeAppStateListener = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, callback) => {
      expect(type).toBe('change');
      changeAppState = callback;
      return {remove: removeAppStateListener};
    });
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    Platform.OS = previousPlatform;
    AppState.currentState = previousAppState;
    jest.restoreAllMocks();
  });

  it('requests camera access and pauses QR scanning while a scanned code is handled', async () => {
    check.mockResolvedValue(RESULTS.DENIED);
    let finishScan;
    const onScan = jest.fn(() => new Promise(resolve => { finishScan = resolve; }));
    await act(async () => { renderer = create(<BarcodeReader onScan={onScan} />); });

    expect(check).toHaveBeenCalledWith(PERMISSIONS.ANDROID.CAMERA);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.CAMERA);
    const camera = renderer.root.findByType('Camera');
    expect(camera.props.device.id).toBe('back-camera');
    expect(camera.props.isActive).toBe(true);
    expect(camera.props.codeScanner.codeTypes).toEqual(['qr']);

    const codes = [{type: 'qr', value: 'wallet-qr-fixture'}];
    await act(async () => {
      camera.props.codeScanner.onCodeScanned(codes, {width: 1280, height: 720});
    });
    expect(onScan).toHaveBeenCalledWith(codes);
    expect(triggerHapticSuccess).toHaveBeenCalledTimes(1);
    // The camera stays in its window; a second code is ignored while the first is handled.
    await act(async () => {
      camera.props.codeScanner.onCodeScanned(codes, {width: 1280, height: 720});
    });
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(triggerHapticSuccess).toHaveBeenCalledTimes(1);
    const text = () => renderer.root.findAllByType('Text').map(node => node.children.join('')).join(' ');
    expect(text()).toContain('Reading code…');

    await act(async () => { finishScan(); });
    expect(text()).not.toContain('Reading code…');
    expect(renderer.root.findByType('Camera').props.isActive).toBe(true);
    await act(async () => {
      renderer.root.findByType('Camera').props.codeScanner.onCodeScanned(codes, {width: 1280, height: 720});
    });
    expect(onScan).toHaveBeenCalledTimes(2);
  });

  it('deactivates the camera in the background and when the screen disables scanning', async () => {
    await act(async () => { renderer = create(<BarcodeReader />); });
    act(() => changeAppState('background'));
    expect(renderer.root.findByType('Camera').props.isActive).toBe(false);
    act(() => changeAppState('active'));
    expect(renderer.root.findByType('Camera').props.isActive).toBe(true);

    act(() => renderer.update(<BarcodeReader active={false} />));
    expect(renderer.root.findByType('Camera').props.isActive).toBe(false);

    act(() => renderer.unmount());
    renderer = undefined;
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });

  it('offers settings instead of opening the camera when permission is blocked', async () => {
    check.mockResolvedValue(RESULTS.BLOCKED);
    await act(async () => { renderer = create(<BarcodeReader />); });
    expect(renderer.root.findAllByType('Camera')).toHaveLength(0);
    expect(request).not.toHaveBeenCalled();
    const settingsButton = renderer.root.findByType('Button');
    expect(settingsButton.props.children).toBe('Open Settings');
    act(() => settingsButton.props.onPress());
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
