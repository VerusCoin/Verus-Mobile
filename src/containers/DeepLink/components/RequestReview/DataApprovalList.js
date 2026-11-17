import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {Check} from 'lucide-react-native';
import CopyAction from '../../../../components/CopyAction';
import TextAction from '../../../../components/TextAction';
import StatusBadge from '../../../../components/StatusBadge';
import {dataApprovalListStyles as createStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import DeepLinkRequestSheetScaffold from './DeepLinkRequestSheetScaffold';

const formatValue = value =>
  typeof value === 'string'
    ? value
    : JSON.stringify(value, null, 2) ?? String(value);

export const getItemApprovalLabel = title => {
  const words = title.trim().split(/\s+/);
  if (words.length > 3 || title.length > 24) return 'Approve item';
  const label = /^[A-Z]{2}/.test(title)
    ? title
    : title.charAt(0).toLowerCase() + title.slice(1);
  return `Approve ${label}`;
};

const DataApprovalItem = ({
  item,
  index,
  total,
  approved,
  open,
  disabled,
  onUndo,
  openItemRef,
  onOpenItemLayout,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  return (
    <View
      collapsable={false}
      ref={open ? openItemRef : undefined}
      onLayout={open ? onOpenItemLayout : undefined}
      style={[styles.row, open && styles.openRow]}>
      <View
        accessible={open}
        accessibilityLabel={open ? `Item ${index + 1} of ${total}` : undefined}
        accessibilityElementsHidden={approved}
        importantForAccessibility={approved ? 'no-hide-descendants' : 'auto'}
        style={[styles.marker, open && styles.openMarker]}>
        {approved ? (
          <Check size={20} strokeWidth={2.5} color={theme.colors.successText} />
        ) : (
          <Text style={[styles.number, open && styles.openNumber]}>
            {index + 1}
          </Text>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            accessibilityLabel={approved ? `${item.title}, approved` : item.title}
            style={[styles.title, !approved && !open && styles.waitingTitle]}>
            {item.title}
          </Text>
          {item.unreadable && !approved ? (
            <StatusBadge label="Check first" tone="warning" />
          ) : null}
        </View>
        {open ? (
          <View style={styles.value}>
            {item.content}
            {item.details?.length > 0 ? (
              <TextAction
                accessibilityRole="button"
                accessibilityLabel={`View details for ${item.title}`}
                accessibilityState={{disabled}}
                disabled={disabled}
                onPress={() => setDetailsVisible(true)}
                style={styles.detailsAction}>
                View details
              </TextAction>
            ) : null}
          </View>
        ) : null}
      </View>
      {approved ? (
        <TextAction
          accessibilityRole="button"
          accessibilityLabel={`Undo approval of ${item.title}`}
          accessibilityState={{disabled}}
          disabled={disabled}
          onPress={onUndo}
          style={styles.undoAction}>
          Undo
        </TextAction>
      ) : null}
      <DeepLinkRequestSheetScaffold
        visible={detailsVisible && !disabled}
        onClose={() => setDetailsVisible(false)}
        maxHeight="78%"
        title={item.title}>
        {(item.details || [])
          .filter(row => row.value != null && formatValue(row.value).trim() !== item.title.trim())
          .map((row, rowIndex) => (
            <View key={rowIndex} style={styles.detailField}>
              <View style={styles.detailLabelRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                {row.copy ? (
                  <CopyAction
                    accessibilityLabel={`Copy ${row.label}`}
                    disabled={disabled}
                    value={formatValue(row.value)}
                  />
                ) : null}
              </View>
              <Text
                selectable
                style={row.technical ? styles.technicalValue : styles.detailValue}>
                {formatValue(row.value)}
              </Text>
            </View>
          ))}
      </DeepLinkRequestSheetScaffold>
    </View>
  );
};

export default function DataApprovalList({items, consent, processing, openItemRef, onOpenItemLayout}) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const openIndex = items.findIndex(item => !consent.checked[item.key]);
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <DataApprovalItem
          key={item.key}
          item={item}
          index={index}
          total={items.length}
          approved={!!consent.checked[item.key]}
          open={index === openIndex}
          disabled={processing}
          openItemRef={openItemRef}
          onOpenItemLayout={onOpenItemLayout}
          onUndo={() => {
            if (!processing && consent.checked[item.key]) {
              consent.toggle(item.key);
            }
          }}
        />
      ))}
    </View>
  );
}
