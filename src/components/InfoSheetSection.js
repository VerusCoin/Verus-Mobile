import React, {useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import CopyAction from './CopyAction';
import CopyFeedback from './CopyFeedback';
import useCopyFeedback from '../hooks/useCopyFeedback';
import PrivacyBlurredText from './PrivacyBlurredText';
import {createInfoSheetStyles, deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

export const InfoSheetTopic = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createInfoSheetStyles(theme), [theme]);

  return (
    <View style={styles.topic}>
      <Text accessibilityRole="header" style={styles.topicTitle}>{title}</Text>
      <Text selectable style={styles.topicBody}>{children}</Text>
    </View>
  );
};

// `copy` adds the shared copy button beside the row. It copies `copyValue`
// when the shown value differs from the text to copy. `accessory` is a node at
// the right of the row, for example a status badge. It comes before the copy
// button when the row has both. `valueHidden` blurs a money value and replaces
// its spoken value with "Balance hidden". `valueUnit`, for example a ticker,
// follows the value and stays readable while the value is hidden.
// `longPressCopy` opts into fact-row feedback without adding a visible button.
export const InfoSheetRow = ({
  accessory,
  copy = false,
  copyValue,
  ellipsizeMode,
  label,
  labelStyle,
  longPressCopy = false,
  numberOfLines,
  selectable = true,
  value,
  valueHidden = false,
  valueStyle,
  valueUnit,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {
    disabled: !longPressCopy || valueHidden,
    haptic: true,
  });
  const Container = canCopy ? Pressable : View;

  if (value == null) return null;

  const visibleValue = (
    <Text
      ellipsizeMode={ellipsizeMode}
      numberOfLines={numberOfLines}
      selectable={canCopy ? false : selectable}
      style={[styles.requestInfoValue, valueStyle]}>
      {valueUnit ? `${value} ${valueUnit}` : value}
    </Text>
  );
  const text = (
    <>
      <Text style={[styles.requestInfoLabel, labelStyle]}>{label}</Text>
      {valueHidden ? (
        <View
          accessible
          accessibilityLabel="Balance hidden"
          style={localStyles.hiddenValueRow}>
          <PrivacyBlurredText
            blurRadius={7}
            color={StyleSheet.flatten([styles.requestInfoValue, valueStyle]).color}
            hidden
            style={[styles.requestInfoValue, valueStyle]}>
            {value}
          </PrivacyBlurredText>
          {valueUnit ? (
            <Text style={[styles.requestInfoValue, valueStyle]}>
              {` ${valueUnit}`}
            </Text>
          ) : null}
        </View>
      ) : longPressCopy ? (
        <CopyFeedback copied={copied}>
          {visibleValue}
        </CopyFeedback>
      ) : visibleValue}
    </>
  );

  if (!copy && !accessory) {
    return <Container accessible={canCopy || undefined} {...copyProps} style={styles.requestInfoRow}>{text}</Container>;
  }

  return (
    <View style={[styles.requestInfoRow, styles.requestInfoRowWithAction]}>
      <Container accessible={canCopy || undefined} {...copyProps} style={styles.requestInfoRowText}>{text}</Container>
      {accessory}
      {copy ? (
        <CopyAction
          accessibilityLabel={`Copy ${label.toLowerCase()}`}
          copiedAccessibilityLabel={`${label} copied`}
          value={copyValue ?? value}
        />
      ) : null}
    </View>
  );
};

const InfoSheetSection = ({rows = [], title}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const visibleRows = rows.filter(row => row && row.value != null);

  if (visibleRows.length === 0) return null;

  return (
    <View style={styles.requestInfoSection}>
      <Text style={styles.requestInfoSectionTitle}>{title}</Text>
      <View style={styles.requestInfoRows}>
        {visibleRows.map((row, index) => (
          <InfoSheetRow
            key={`${title}-${row.label}-${index}`}
            {...row}
          />
        ))}
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  hiddenValueRow: {flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap'},
});

export default InfoSheetSection;
