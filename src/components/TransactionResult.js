import React from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ExternalLink} from 'lucide-react-native';
import AnimatedSuccessCheckmark from './AnimatedSuccessCheckmark';
import AppButton from './AppButton';
import CopyAction from './CopyAction';
import CopyFeedback from './CopyFeedback';
import useCopyFeedback from '../hooks/useCopyFeedback';
import FadedScrollView from './FadedScrollView';
import SafeBottomActionStack from './SafeBottomActionStack';
import SignedOutActionRow from './SignedOutActionRow';
import {fontStyle} from '../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../theme/onboarding';
import {openUrl} from '../utils/linking';

const TransactionIdRow = ({bordered, txid}) => {
  const theme = useOnboardingTheme();
  const {copied, copyProps} = useCopyFeedback(txid, {haptic: true});
  return (
    <View style={[styles.txRow, bordered && styles.txRowBordered, {borderColor: theme.colors.border}]}>
      <Pressable accessible {...copyProps} style={styles.txCopy}>
        <Text style={[styles.txLabel, {color: theme.colors.textSecondary}]}>
          Transaction ID
        </Text>
        <CopyFeedback copied={copied}>
          <Text ellipsizeMode="middle" numberOfLines={1} style={[styles.txid, {color: theme.colors.textPrimary}]}>
            {txid}
          </Text>
        </CopyFeedback>
      </Pressable>
      <CopyAction
        accessibilityLabel="Copy transaction ID"
        copiedAccessibilityLabel="Transaction ID copied"
        value={txid}
      />
    </View>
  );
};

// The screen after the wallet sends one or more transactions: Send, Convert,
// pre-conversions, invoice payments, gift card funding and card claims. It
// follows the Send flow's Sent step: no header, the check beside the title,
// the amounts, one row per transaction, the caption, and the actions.
//
// Say each fact once. The title states the outcome. There is no section label
// and no count line: the rows show the transactions, and the title already
// says what happened to them. Put what happens next in `caption`.
//
// - `title`: the outcome, for example "Transaction sent".
// - `success`: shows the animated check. Pass false when not every
//   transaction was sent.
// - `description`: optional line under the title, only for a fact the title
//   does not state ("1 of 2 transactions was submitted. ...").
// - `amount`: optional summary, such as `TransferNode` rows.
// - `details`: optional `FlatRow` facts above the transaction rows.
// - `transactions`: `[{txid, explorerUrl, label, group}]`. One transaction
//   reads "Transaction ID" only. With two or more (`itemized`), each
//   transaction shows its `group` (for example the chain) and its `label`
//   (what it moved) above its row. `explorerUrl` adds "View in explorer".
// - `itemized`: defaults to two or more transactions. Pass true when one sent
//   transaction belongs to a larger set, as in a partial claim.
// - `caption`: optional line, or list of lines, under the rows.
// - `warning`: optional line in the warning color, for something the user
//   must do.
// - `above`: optional content over the actions, such as why one is off.
// - `actions`: `[{label, onPress, variant, disabled, loading}]`. The first action is
//   primary unless it sets `variant`; the others are secondary.
const TransactionResult = ({
  above = null,
  actions = [],
  amount = null,
  caption = null,
  description = null,
  details = null,
  itemized,
  success = true,
  title,
  transactions = [],
  warning = null,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const rows = (transactions || []).filter(
    item => typeof item?.txid === 'string' && item.txid.length > 0,
  );
  const showItems = itemized == null ? rows.length > 1 : itemized;
  const captions = (Array.isArray(caption) ? caption : [caption]).filter(
    Boolean,
  );

  const renderTransaction = (item, bordered) => (
    <>
      <TransactionIdRow bordered={bordered} txid={item.txid} />
      {item.explorerUrl ? (
        <SignedOutActionRow
          IconComponent={ExternalLink}
          label="View in explorer"
          onPress={() => openUrl(item.explorerUrl)}
        />
      ) : null}
    </>
  );

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <FadedScrollView
        containerStyle={[styles.scrollViewport, {marginTop: insets.top}]}
        contentContainerStyle={[styles.content, smallDevice && styles.contentCompact]}
        fadeBackgroundColor={theme.colors.background}>
        <View style={styles.titleRow}>
          {success ? (
            <AnimatedSuccessCheckmark
              style={smallDevice ? styles.successAnimationCompact : styles.successAnimation}
            />
          ) : null}
          <Text
            accessibilityRole="header"
            style={[
              theme.typography.headlineMd,
              styles.title,
              !success && styles.titleWithoutMark,
              {color: theme.colors.textPrimary},
            ]}>
            {title}
          </Text>
        </View>
        {description ? (
          <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
            {description}
          </Text>
        ) : null}
        {amount ? (
          <View style={[styles.summary, smallDevice && styles.sectionCompact]}>
            {amount}
          </View>
        ) : null}
        {details || (rows.length > 0 && !showItems) ? (
          <View
            style={[
              styles.rows,
              smallDevice && styles.sectionCompact,
              {borderTopColor: theme.colors.border},
            ]}>
            {details}
            {showItems
              ? null
              : rows.map(item => (
                  <React.Fragment key={item.txid}>
                    {renderTransaction(item, false)}
                  </React.Fragment>
                ))}
          </View>
        ) : null}
        {showItems
          ? rows.map((item, index) => (
              <View
                key={item.txid}
                style={index > 0 ? styles.itemGap : styles.item}>
                {item.group ? (
                  <Text style={[styles.itemGroup, {color: theme.colors.textSecondary}]}>
                    {item.group}
                  </Text>
                ) : null}
                {item.label ? (
                  <Text
                    style={[
                      theme.typography.titleRow,
                      styles.itemLabel,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {item.label}
                  </Text>
                ) : null}
                {renderTransaction(item, true)}
              </View>
            ))
          : null}
        {captions.map(line => (
          <Text
            key={line}
            style={[theme.typography.caption, styles.caption, {color: theme.colors.textSubtle}]}>
            {line}
          </Text>
        ))}
        {warning ? (
          <Text
            style={[
              theme.typography.caption,
              styles.warning,
              {color: theme.isDark ? theme.colors.warning : WARNING_TEXT_LIGHT},
            ]}>
            {warning}
          </Text>
        ) : null}
      </FadedScrollView>
      {actions.length > 0 ? (
        <SafeBottomActionStack
          bottomSpacing={smallDevice ? 24 : 40}
          gap={10}
          horizontalSpacing={24}
          safeAreaSpacing={12}
          style={[styles.footer, smallDevice && styles.footerCompact]}>
          {above}
          {actions.map((action, index) => (
            <AppButton
              disabled={action.disabled}
              key={action.label}
              loading={action.loading}
              onPress={action.onPress}
              variant={action.variant || (index === 0 ? 'primary' : 'secondary')}>
              {action.label}
            </AppButton>
          ))}
        </SafeBottomActionStack>
      ) : null}
    </View>
  );
};

// Warning text on the light page. The theme's warning tone is too light for
// body text there.
const WARNING_TEXT_LIGHT = '#9A3412';

const styles = StyleSheet.create({
  screen: {flex: 1},
  scrollViewport: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28},
  contentCompact: {paddingTop: 16},
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  successAnimation: {width: 64, height: 64, marginLeft: -10},
  successAnimationCompact: {width: 48, height: 48, marginLeft: -6},
  title: {flex: 1, marginLeft: 4},
  titleWithoutMark: {marginLeft: 0},
  description: {fontSize: 14, lineHeight: 20, marginTop: 10, ...fontStyle('regular')},
  sectionCompact: {marginTop: 12},
  summary: {marginTop: 24},
  rows: {marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth},
  item: {marginTop: 24},
  itemGap: {marginTop: 24},
  itemGroup: {fontSize: 12, lineHeight: 17, marginBottom: 5, ...fontStyle('semiBold')},
  itemLabel: {marginBottom: 4},
  txRow: {minHeight: 58, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  txRowBordered: {borderTopWidth: StyleSheet.hairlineWidth},
  txCopy: {flex: 1, minWidth: 0, marginRight: 8},
  txLabel: {fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  txid: {fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  caption: {marginTop: 14},
  warning: {marginTop: 8},
  footer: {paddingTop: 16},
  footerCompact: {paddingTop: 8},
});

export default TransactionResult;
