import React, {useState, useEffect, useRef} from 'react';
import {View, ScrollView} from 'react-native';
import {Text, Button} from 'react-native-paper';
import {RNCamera} from 'react-native-camera';
import Colors from '../../globals/colors';
import styles from '../../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {verifyPermissions} from '../../utils/permissions';
import {openSettings, RESULTS, PERMISSIONS, request} from 'react-native-permissions';
import BarcodeMask from 'react-native-barcode-mask';
import AnimatedActivityIndicator from '../AnimatedActivityIndicator';
import {triggerHapticSuccess} from '../../utils/haptics/haptics';

const BarcodeReader = props => {
  const cameraProps = props.cameraProps == null ? {} : props.cameraProps;
  const maskProps = props.maskProps == null ? {} : props.maskProps;

  const componentIsMounted = useRef(true);
  const [needToGoToSettings, setNeedToGoToSettings] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  const {prompt, button, onScan, cameraOn} = props;
  const cameraOff = cameraOn != null && !cameraOn;

  const maskHeight =
    props.maskProps == null || props.maskProps.height == null
      ? 240
      : props.maskProps.height;
  const maskWidth =
    props.maskProps == null || props.maskProps.width == null
      ? 240
      : props.maskProps.width;

  const handleBarcodeRead = async e => {
    triggerHapticSuccess();
    setLoading(true);

    if (onScan != null) {
      await onScan(e);
    }

    if (componentIsMounted.current) {
      setLoading(false);
    }
  };

  const onMount = async () => {
    const permissionStatus = await verifyPermissions(
      PERMISSIONS.IOS.CAMERA,
      PERMISSIONS.ANDROID.CAMERA,
    );
  
    if (permissionStatus.canUse) {
      setHasCameraPermission(true);
    } else if (permissionStatus.reason === RESULTS.BLOCKED) {
      setNeedToGoToSettings(true);
    } else {
      // Request permission and update state
      const requestResult = await request(
        Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA
      );
      if (requestResult === RESULTS.GRANTED) {
        setHasCameraPermission(true);
      } else if (requestResult === RESULTS.BLOCKED) {
        setNeedToGoToSettings(true);
      }
    }
  };

  useEffect(() => {
    onMount();
  }, []);

  return cameraOff || loading ? (
    <View style={styles.focalCenter}>
      <AnimatedActivityIndicator
        style={{
          width: 128,
        }}
      />
    </View>
  ) : hasCameraPermission ? (
    <RNCamera
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'column',
      }}
      onBarCodeRead={handleBarcodeRead}
      captureAudio={false}
      {...cameraProps}>
      <View style={{...styles.centerContainer, zIndex: 1, width: '75%'}}>
        <Text
          style={{
            fontSize: 20,
            color: Colors.secondaryColor,
            marginBottom: maskHeight + 24,
            textAlign: 'center',
          }}>
          {prompt ? prompt : 'Scan a QR code'}
        </Text>
      </View>
      <BarcodeMask
        showAnimatedLine={false}
        height={maskHeight}
        width={maskWidth}
        {...maskProps}
      />
      {button ? button() : null}
    </RNCamera>
  ) : (
    <ScrollView
      style={styles.flexBackground}
      contentContainerStyle={{...styles.centerContainer, backgroundColor: Colors.primaryColor}}>
      <MaterialCommunityIcons
        name={'camera-off'}
        color={Colors.secondaryColor}
        size={104}
      />
      <Text
        style={{
          ...styles.centeredText,
          ...styles.standardWidthCenterBlock,
          color: Colors.secondaryColor,
          fontSize: 20,
        }}>
        {'Allow Verus Mobile to use your camera to scan QR codes.'}
      </Text>
      <Button onPress={openSettings} color={Colors.secondaryColor} style={{ marginBottom: 8 }}>
        {needToGoToSettings ? 'Configure in settings' : 'Allow'}
      </Button>
      {button ? button() : null}
    </ScrollView>
  );
};

export default BarcodeReader;
