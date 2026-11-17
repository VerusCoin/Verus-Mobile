import React, {useEffect, useState} from 'react';
import {verusIdCopy} from '../../../../../utils/verusid/verusIdCopy';
import {Keyboard, Pressable, Text, View} from 'react-native';
import {Info, TriangleAlert} from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../../components/AppButton';
import FadedScrollView from '../../../../../components/FadedScrollView';
import InfoSheet from '../../../../../components/InfoSheet';
import {InfoSheetTopic} from '../../../../../components/InfoSheetSection';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import ProgressHeader from '../../../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import AppStatusBadge from '../../../../../components/StatusBadge';
import SelectionSheet, {SelectionRow} from '../../../../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../../../../components/SkeletonLoader';
import useSheetDismissal from '../../../../../components/useSheetDismissal';
import {ErrorMessage} from '../../../../SendWizard/components/WizardUI';
import {useOnboardingSmallDeviceLayout} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {identityManagementStyles as styles} from '../../../../../styles';
import {VerusIdFormScrollContext, useVerusIdFormScroll} from '../VerusIdFormScroll';
import {wrapVerusIdNames} from '../VerusIdCard';
import TextAction from '../../../../../components/TextAction';
import {isVerusIdTransportError, verusIdErrorMessage} from '../verusIdErrors';

// Preserve engine messages, changing only the product term at the UI boundary.
export const verusIdText = verusIdCopy;

export const Body = ({children, muted = false, style}) => {
  const theme = useOnboardingTheme();
  return <Text accessibilityLabel={typeof children === 'string' ? verusIdText(children) : undefined}
    style={[theme.typography.bodySm, {color: muted ? theme.colors.textSecondary : theme.colors.textPrimary}, style]}>
    {React.Children.map(children, child => wrapVerusIdNames(verusIdText(child)))}</Text>;
};

export const SectionTitle = ({children}) => {
  const theme = useOnboardingTheme();
  return <Text accessibilityRole="header" style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>{children}</Text>;
};

export function ManagementInfoButton({label, disabled, onPress}) {
  const theme = useOnboardingTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} style={styles.infoButton}>
    <Info size={23} strokeWidth={2.2} color={theme.colors.textPrimary} />
  </Pressable>;
}

export function useManagementKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {show.remove(); hide.remove();};
  }, []);
  return keyboardOpen;
}

export function ManagementError({error, busy, onRetry}) {
  if (!error) return null;
  return <View accessibilityRole="alert" accessibilityLiveRegion="assertive">
    <ErrorMessage>{verusIdErrorMessage(error)}</ErrorMessage>
    {isVerusIdTransportError(error) && onRetry && <TextAction disabled={busy} onPress={onRetry}>Try again</TextAction>}
  </View>;
}

export function ManagementPage({children, title, progress, onBack, busy, error, footer, info, infoTitle, infoHeight, onRetry}) {
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const keyboardOpen = useManagementKeyboard();
  const formScroll = useVerusIdFormScroll(keyboardOpen);
  const [infoOpen, setInfoOpen] = useState(false);
  return <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
    <ProgressHeader title={title} progress={progress} showProgress={progress != null}
      backDisabled={busy} onBack={onBack}
      rightAction={info ? <ManagementInfoButton label={infoTitle || `About ${title.toLowerCase()}`}
        disabled={busy} onPress={() => {Keyboard.dismiss(); setInfoOpen(true);}} /> : undefined} />
    <KeyboardAvoidingForm style={styles.screen}>
      <VerusIdFormScrollContext.Provider value={formScroll.context}>
      <FadedScrollView key={title} containerStyle={styles.scroll}
        ref={formScroll.scrollRef} onLayout={formScroll.onLayout} onContentSizeChange={formScroll.onContentSizeChange}
        contentContainerStyle={[styles.content, formScroll.keyboardPadding]}
        fadeBackgroundColor={theme.colors.background} keyboardShouldPersistTaps="handled">
        {children}
      </FadedScrollView>
      </VerusIdFormScrollContext.Provider>
      <View onLayout={formScroll.onFooterLayout} style={{flexShrink: 0, backgroundColor: theme.colors.background}}>
      <SafeBottomActionStack horizontalSpacing={20} bottomSpacing={keyboardOpen ? 12 : smallDevice ? 30 : 48}
        includeBottomInset={!keyboardOpen} gap={8} style={[styles.footer, smallDevice && styles.footerCompact]}>
        <ManagementError error={error} busy={busy} onRetry={onRetry} />
        {footer}
      </SafeBottomActionStack>
      </View>
    </KeyboardAvoidingForm>
    {!!info && <InfoSheet title={infoTitle || `About ${title.toLowerCase()}`} maxHeight={infoHeight}
      visible={infoOpen} onClose={() => setInfoOpen(false)}>
      {info.map(([label, value]) => <InfoSheetTopic key={label} title={label}>{wrapVerusIdNames(verusIdText(value))}</InfoSheetTopic>)}
    </InfoSheet>}
  </View>;
}

export const ActionButton = ({busy, disabled, children, secondary, ...props}) => <AppButton
  {...props} disabled={busy || disabled} loading={busy} variant={secondary ? 'secondary' : 'primary'}>{children}</AppButton>;

export function DetailRow({label, children, technical = false, status}) {
  const theme = useOnboardingTheme();
  return <View style={[technical ? styles.stackedFact : styles.fact, {borderColor: theme.colors.border}]}>
    {status ? <AppStatusBadge label={status} tone="neutral" />
      : !!label && <Body muted style={technical ? undefined : styles.flexible}>{label}</Body>}
    <Text selectable={technical} style={[theme.typography.labelMd, {color: theme.colors.textPrimary},
      technical ? styles.identifier : styles.factValue]} accessibilityLabel={verusIdText(children)}>{wrapVerusIdNames(verusIdText(children))}</Text>
  </View>;
}

export function Disclosure({title, children}) {
  const theme = useOnboardingTheme();
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded: open}}
      onPress={() => setOpen(value => !value)} style={[styles.fact, {borderColor: theme.colors.border}]}>
      <Body muted style={styles.flexible}>{title}</Body>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textSubtle} />
    </Pressable>
    {open && <View style={styles.section}>{children}</View>}
  </View>;
}

export function SelectionField({label, value, options, onSelect, disabled}) {
  const theme = useOnboardingTheme();
  const [visible, setVisible] = useState(false);
  const dismissal = useSheetDismissal({visible, onClose: () => setVisible(false)});
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{disabled: !!disabled}}
      disabled={disabled} onPress={() => {Keyboard.dismiss(); setVisible(true);}} style={[styles.fact, {borderColor: theme.colors.border}]}>
      <Body muted style={styles.flexible}>{label}</Body>
      <Text accessibilityLabel={value} style={[theme.typography.labelMd, styles.factValue, {color: theme.colors.textPrimary}]}>{wrapVerusIdNames(value)}</Text>
      <Icon name="chevron-right" size={22} color={theme.colors.textSubtle} />
    </Pressable>
    <SelectionSheet title={label} visible={visible} onClose={dismissal.close} onClosed={dismissal.onClosed}>
      {options.map(option => <SelectionRow key={option.value} title={wrapVerusIdNames(option.label)} subtitle={option.description}
        accessibilityLabel={[option.label, option.description].filter(Boolean).join(', ')}
        selected={option.selected} showChevron={false} onPress={() => dismissal.dismiss(() => onSelect(option.value))} />)}
    </SelectionSheet>
  </>;
}

export function CheckOption({label, accessibilityLabel = label, checked, disabled, onPress}) {
  const theme = useOnboardingTheme();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={accessibilityLabel}
    accessibilityState={{checked, disabled: !!disabled}} disabled={disabled} onPress={onPress} style={styles.checkbox}>
    <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={!checked && theme.isDark ? theme.colors.textPrimary : theme.colors.link} accessible={false} />
    <Body style={styles.flexible}>{label}</Body>
  </Pressable>;
}

export function Warning({children}) {
  const theme = useOnboardingTheme();
  return <View style={[styles.warning, {backgroundColor: theme.colors.warningBackground}]}>
    <TriangleAlert size={16} color={theme.colors.warningText} />
    <Body style={styles.flexible}>{children}</Body>
  </View>;
}

export const LoadingIdentity = () => <SkeletonLoader accessibilityLabel="Loading VerusID" style={styles.skeleton}>
  {[72, 48, 64].map((height, index) => <SkeletonBlock key={index} height={height} radius={12} />)}
</SkeletonLoader>;
