import React, {useMemo, useState} from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ServiceManagerHeader from '../../components/ServiceManagerHeader';
import KeyboardAvoidingForm from '../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import BottomSheetModal from '../../components/BottomSheetModal';
import {SheetScrollCue} from '../../components/SheetScrollView';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {getAssetPresentation} from '../../utils/assets/assetPresentation';
import {useOnboardingTheme} from '../../theme/onboarding';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {createSignedOutSheetStyles} from '../../styles/components/signedOutSheet.styles';
import {createManageAssetsStyles} from './manageAssets.styles';
import {deepLinkRequestReviewStyles} from '../../styles';

export const systemLabel = systemId => {
  try { return CoinDirectory.findCoinObj(systemId).display_name; }
  catch (_) { return systemId; }
};

export const AssetScreen = ({children, footer, header, onBack, testID, title}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen} testID={testID}>
      <KeyboardAvoidingForm style={styles.keyboardAvoider}>
        <ServiceManagerHeader onBack={onBack} title={title} />
        {header}
        {children}
        {footer}
      </KeyboardAvoidingForm>
    </SafeAreaView>
  );
};

export const AssetFooter = ({children, styles}) => {
  const {keyboardVisible} = useOnboardingSmallDeviceLayout();
  return (
    <SafeBottomActionStack
      bottomSpacing={keyboardVisible ? 8 : 14}
      gap={10}
      horizontalSpacing={20}
      includeBottomInset={!keyboardVisible}
      safeAreaSpacing={keyboardVisible ? 0 : 12}
      style={styles.footer}>
      {children}
    </SafeBottomActionStack>
  );
};

export const AssetScrollView = ({children, contentContainerStyle, onContentSizeChange, onLayout, scrollRef, styles, testID}) => {
  const theme = useOnboardingTheme();
  const {keyboardVisible} = useOnboardingSmallDeviceLayout();
  const cueStyles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  const [metrics, setMetrics] = useState({content: 0, viewport: 0, offset: 0});
  const update = next => setMetrics(current => {
    const merged = {...current, ...next};
    return Object.keys(merged).every(key => merged[key] === current[key]) ? current : merged;
  });
  const overflow = metrics.viewport > 0 && metrics.content > metrics.viewport + 8;
  const showCue = !keyboardVisible && overflow && metrics.offset + metrics.viewport < metrics.content - 8;
  return (
    <View style={styles.scrollFrame}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(width, content) => {
          update({content});
          onContentSizeChange?.(width, content);
        }}
        onLayout={event => {
          update({viewport: event.nativeEvent.layout.height});
          onLayout?.(event);
        }}
        onScroll={event => update({offset: event.nativeEvent.contentOffset.y})}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={overflow}
        style={styles.scroll}
        testID={testID}>
        {children}
      </ScrollView>
      {showCue ? (
        <SheetScrollCue styles={cueStyles} theme={theme} backgroundColor={theme.colors.background} />
      ) : null}
    </View>
  );
};

export const ReviewRow = ({label, value, copy = false, styles, valueStyle}) => (
  <View style={styles.reviewRow}>
    <Text style={styles.rowDescription}>{label}</Text>
    <View style={styles.reviewValueLine}>
      <Text selectable style={[styles.reviewValue, copy && styles.identifier, valueStyle]}>{String(value)}</Text>
      {copy ? <CopyAction accessibilityLabel={`Copy ${label.toLowerCase()}`} value={value} /> : null}
    </View>
  </View>
);

export const AssetLogo = ({coin, presentation = coin && getAssetPresentation(coin), styles}) => (
  <View style={styles.rowLogo}>
    <AssetCoinLogo coinId={presentation?.logoId} badgeTicker={presentation?.badgeTicker || null} size={38} />
  </View>
);

export const AssetLoadingRows = ({styles}) => (
  <SkeletonLoader accessibilityLabel="Loading your assets">
    {[0, 1, 2].map(row => (
      <View key={row} style={styles.skeletonRow}>
        <SkeletonBlock width={38} height={38} radius={19} />
        <View style={styles.rowCopy}><SkeletonBlock width="65%" height={16} /><SkeletonBlock width="80%" height={14} /></View>
      </View>
    ))}
  </SkeletonLoader>
);

export const NetworkPicker = ({onClose, onSelect, options, selected, title = 'Network', visible}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  return (
    <BottomSheetModal maxHeight="76%" onClose={onClose} visible={visible}>
      <View style={[sheetStyles.body, sheetStyles.bodyList]}>
        <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          {options.map(option => (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityState={{checked: selected === option.id}}
              key={option.id}
              onPress={() => { onSelect(option.id); onClose(); }}
              style={[styles.networkOption, selected === option.id && styles.networkOptionSelected]}>
              <Text style={styles.networkOptionLabel}>{option.label}</Text>
              {selected === option.id ? <MaterialCommunityIcons name="check" size={20} color={theme.colors.success} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <SafeBottomActionStack bottomSpacing={12} horizontalSpacing={20} includeBottomInset={false}>
        <AppButton onPress={onClose} variant="secondary">Done</AppButton>
      </SafeBottomActionStack>
    </BottomSheetModal>
  );
};
