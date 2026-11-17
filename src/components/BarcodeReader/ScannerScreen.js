import React, {useEffect, useMemo} from 'react';
import {BackHandler, View} from 'react-native';
import ProgressHeader from '../ProgressHeader';
import {barcodeReaderStyles as createStyles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import BarcodeReader from './BarcodeReader';

// A full-screen scanner step: the shared header with Back and a short title,
// then the camera window. Back (and Android back) leaves the scanner.
const ScannerScreen = ({
  borderless = false,
  onBack,
  progress,
  title,
  ...readerProps
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!onBack) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.screen}>
      <ProgressHeader
        borderless={borderless}
        onBack={onBack}
        progress={progress ?? 0}
        showProgress={progress != null}
        title={title}
      />
      <BarcodeReader {...readerProps} style={styles.screenContent} />
    </View>
  );
};

export default ScannerScreen;
