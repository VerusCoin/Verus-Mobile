import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, useWindowDimensions, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {VerusLogo} from '../../../images/customIcons';
import WelcomeBackgroundVideo from '../../../components/WelcomeBackgroundVideo';
import OnboardingStartSheet from './OnboardingStartSheet';
import SignedOutNetworkSelector from '../../../components/SignedOutNetworkSelector';
import {readDeeplinkFromNfc} from '../../../actions/actionDispatchers';
import {
  IMPORT_METHODS,
  normalizeSetupSelection,
  SETUP_PATHS,
} from '../onboardingSetupFlow';
import {useOnboardingTheme} from '../../../theme/onboarding';

const LOGO_ASPECT_RATIO = 2084 / 7305;
const LOGO_TOP_MARGIN = 22;

export default function LandingScreen(props) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [startSheetVisible, setStartSheetVisible] = useState(false);
  const logoWidth = width * 0.3;
  const logoVariant = theme.isDark ? 'monochrome' : 'default';

  const resumePendingDeeplinkId =
    props.route?.params?.resumePendingDeeplinkId || null;
  const claimRequestIsTestnet =
    props.route?.params?.claimRequestIsTestnet;
  const openSetupSheet = props.route?.params?.openSetupSheet === true;

  useEffect(() => {
    if (!openSetupSheet) return;

    if (typeof claimRequestIsTestnet === 'boolean') {
      props.setTestProfile(claimRequestIsTestnet);
    }
    setStartSheetVisible(true);
  }, [claimRequestIsTestnet, openSetupSheet, props.setTestProfile]);

  const handleSetupSelection = selection =>
    props.navigation.navigate('CreateProfile', {
      ...normalizeSetupSelection(selection),
      resumePendingDeeplinkId,
    });

  // A wallet-backup card leads to the NFC restore instead.
  const claimFromNfc = () =>
    readDeeplinkFromNfc({
      onWalletBackupDetected: () =>
        handleSetupSelection({
          setupPath: SETUP_PATHS.IMPORT,
          importMethod: IMPORT_METHODS.NFC,
        }),
    });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <WelcomeBackgroundVideo />
      <SignedOutNetworkSelector
        testProfile={props.testProfile}
        setTestProfile={props.setTestProfile}
      />
      <View
        style={[
          styles.logoContainer,
          {
            paddingTop: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo
          width={logoWidth}
          height={logoWidth * LOGO_ASPECT_RATIO}
          variant={logoVariant}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.headline}>
          {'With Verus you own your identity, data, and money'}
        </Text>
      </View>
      <SafeBottomActionStack>
        <AppButton
          onPress={() => setStartSheetVisible(true)}
          testID="onboarding.landing.getStarted"
          variant="primary"
          height={56}>
          {'Get started'}
        </AppButton>
      </SafeBottomActionStack>
      <OnboardingStartSheet
        visible={startSheetVisible}
        onClose={() => setStartSheetVisible(false)}
        onSelectSetup={handleSetupSelection}
        // The sheet also opens to create a wallet for a claim in progress;
        // reading another card is not offered then.
        onClaimFromNfc={resumePendingDeeplinkId ? undefined : claimFromNfc}
      />
    </View>
  );
}

const createStyles = theme => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundVideo,
  },
  logoContainer: {
    paddingHorizontal: 32,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingRight: 48,
  },
  headline: {
    ...theme.typography.headlineMd,
    textAlign: 'left',
    color: theme.colors.textPrimary,
  },
});
