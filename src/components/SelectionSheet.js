import React, {useMemo} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Check, ChevronLeft} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from './BottomSheetModal';
import HeaderCloseButton from './HeaderCloseButton';
import SheetScrollView from './SheetScrollView';
import {
  createSignedOutSheetStyles,
  createSelectionSheetStyles,
} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

// The approved V2 box, shared by selection rows and start-aligned add-ons.
export const SelectionCheckbox = ({checked}) => {
  const theme = useOnboardingTheme();
  return (
    <MaterialCommunityIcons
      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={24}
      color={!checked && theme.isDark ? theme.colors.textPrimary : theme.colors.link}
      accessible={false}
    />
  );
};

export const SelectionRow = ({
  title,
  titleNumberOfLines,
  subtitle,
  titleMonospace,
  subtitleMonospace,
  selected,
  onPress,
  value,
  valueLabel,
  valueContent,
  quietValue = false,
  leading,
  badge,
  accessibilityLabel,
  accessibilityRole = 'button',
  showChevron = true,
  compact = false,
  dense = false,
  // A choice that exists but cannot be picked now, such as a private card
  // that still syncs. The subtitle says why.
  disabled = false,
  // A completed choice keeps its value readable and has no selection control.
  readOnly = false,
  preserveSubtitle = false,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const isCheckbox = accessibilityRole === 'checkbox';
  const rowDisabled = disabled || readOnly;
  return (
    <TouchableOpacity
      accessibilityRole={accessibilityRole}
      accessibilityLabel={
        accessibilityLabel ||
        [title, subtitle, value, valueLabel]
          .filter(item => item != null && item !== '')
          .join(', ')
      }
      accessibilityState={
        isCheckbox
          ? {checked: Boolean(selected), disabled: rowDisabled}
          : selected == null && !rowDisabled ? undefined : {selected: Boolean(selected), disabled: rowDisabled}
      }
      activeOpacity={0.74}
      disabled={rowDisabled}
      hitSlop={dense ? {top: 2, bottom: 2, left: 0, right: 0} : undefined}
      onPress={onPress}
      style={[
        styles.row,
        compact && styles.compactRow,
        dense && styles.denseRow,
        selected && !isCheckbox && styles.selectedRow,
      ]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={[
        styles.copy,
        preserveSubtitle && styles.preservedCopy,
        readOnly ? styles.readOnlyContent : rowDisabled && styles.disabledContent,
      ]}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={titleNumberOfLines ?? (compact ? 1 : undefined)}
          style={[styles.rowTitle, compact && styles.compactTitle, dense && styles.denseTitle, titleMonospace && styles.identifier]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={compact ? 1 : undefined}
            style={[
              styles.rowSubtitle,
              compact && styles.compactSubtitle,
              dense && styles.denseSubtitle,
              subtitleMonospace && styles.identifier,
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <View style={styles.badge}>{badge}</View> : null}
      {value != null || valueContent ? (
        <View style={[
          styles.value,
          preserveSubtitle && styles.wrappingValue,
          rowDisabled && !readOnly && styles.disabledContent,
        ]}>
          {valueContent || (
            <>
              <Text style={[styles.valueText, quietValue && styles.quietValueText, preserveSubtitle && styles.wrappingValueText]}>{value}</Text>
              {valueLabel ? (
                <Text style={[styles.valueLabel, quietValue && styles.quietValueLabel]}>{valueLabel}</Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      {!readOnly && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.indicator,
            compact && styles.compactIndicator,
            isCheckbox && styles.checkboxIndicator,
            isCheckbox && rowDisabled && styles.disabledContent,
          ]}>
          {isCheckbox ? (
            <SelectionCheckbox checked={selected} />
          ) : rowDisabled ? null : selected ? (
            <Check color={theme.colors.successText} size={20} strokeWidth={2.4} />
          ) : showChevron ? (
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.textSubtle}
            />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SelectionGroup = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
};

export const SelectionAction = ({title, onPress}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.74}
      onPress={onPress}
      style={styles.action}>
      <Text style={styles.actionText}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={theme.colors.textSubtle}
      />
    </TouchableOpacity>
  );
};

const SelectionSheet = ({
  children,
  title,
  subtitle,
  header,
  footer,
  visible,
  onClose,
  onClosed,
  onBack,
  backAccessibilityLabel = 'Back',
  // Shows the shared close X on the right of the title. Only for a sheet
  // that fills most of the screen and has a search field (DESIGN.md).
  showClose = false,
  contentContainerStyle,
  avoidKeyboard = false,
  fillHeight = false,
  maxHeight = '76%',
  listProps,
  scrollViewProps,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const bodyStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      avoidKeyboard={avoidKeyboard}
      maxHeight={maxHeight}
      contentContainerStyle={[fillHeight ? {height: maxHeight} : null, contentContainerStyle]}>
      <View
        style={[
          bodyStyles.body,
          bodyStyles.bodyShort,
          styles.body,
          fillHeight && styles.fill,
        ]}
        onAccessibilityEscape={onClose}>
        <View style={[styles.header, (onBack || showClose) && styles.nestedHeader]}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={backAccessibilityLabel}
              onPress={onBack}
              style={styles.backButton}>
              <ChevronLeft size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
          {showClose ? (
            <>
              <View style={styles.headerTitleBlock}>
                <Text accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <HeaderCloseButton onPress={onClose} style={styles.closeButton} />
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </>
          )}
        </View>
        {header ? <View style={styles.headerContent}>{header}</View> : null}
        <SheetScrollView
          fill={fillHeight}
          listProps={listProps}
          scrollViewProps={scrollViewProps}
          contentContainerStyle={bodyStyles.listContent}>
          {children}
        </SheetScrollView>
        {footer}
      </View>
    </BottomSheetModal>
  );
};

export default SelectionSheet;
