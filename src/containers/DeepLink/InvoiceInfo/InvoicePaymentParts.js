import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../components/AppButton';
import ProgressHeader from '../../../components/ProgressHeader';
import CopyAction from '../../../components/CopyAction';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {useOnboardingTheme} from '../../../theme/onboarding';
import createStyles from '../../../styles/deeplink/invoicePayment.styles';

export const useInvoiceStyles = () => {
  const theme = useOnboardingTheme();
  const {height} = useWindowDimensions();
  const compact = height <= 700;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  return {theme, styles, compact};
};

export const InvoiceRow = ({label, value, onPress}) => {
  const {theme, styles} = useInvoiceStyles();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      accessibilityRole={onPress ? 'button' : undefined}
      {...(onPress ? {activeOpacity: 0.74, onPress} : {})}
      style={styles.row}>
      <Text
        style={onPress && value == null ? styles.rowAction : styles.rowLabel}>
        {label}
      </Text>
      {value != null && (
        <Text selectable={!onPress} style={styles.rowValue}>
          {value}
        </Text>
      )}
      {onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      )}
    </Wrapper>
  );
};

export const InvoiceCopyRow = ({label, value}) => {
  const {styles} = useInvoiceStyles();
  if (!value) return null;
  return (
    <View style={styles.technicalRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.copyRow}>
        <Text selectable style={styles.technicalValue}>
          {value}
        </Text>
        <CopyAction
          value={value}
          accessibilityLabel={`Copy ${label.toLowerCase()}`}
        />
      </View>
    </View>
  );
};

export const InvoiceSourceRow = ({
  title,
  detail,
  selected = false,
  onPress,
}) => {
  const {theme, styles} = useInvoiceStyles();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{selected}}
      accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      disabled={!onPress}
      activeOpacity={0.74}
      onPress={onPress}
      style={[styles.selection, selected && styles.selected]}>
      <View style={styles.selectionText}>
        <Text style={styles.selectionTitle}>{title}</Text>
        {!!detail && <Text style={styles.selectionDetail}>{detail}</Text>}
      </View>
      {(selected || onPress) && (
        <View style={styles.selectionIcon}>
          <MaterialCommunityIcons
            name={selected ? 'check' : 'chevron-right'}
            size={22}
            color={selected ? theme.colors.success : theme.colors.textSubtle}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const InvoicePaymentLoading = ({sending = false, onClose, title}) => {
  const {theme, styles} = useInvoiceStyles();
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <ProgressHeader
        borderless
        title="Pay invoice"
        progress={sending ? 0.8 : 0.5}
        showBack={!sending && !!onClose}
        onBack={onClose}
      />
      <View style={styles.loading} accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text accessibilityRole="header" style={styles.loadingTitle}>
          {title || (sending ? 'Sending payment' : 'Preparing payment')}
        </Text>
        {!title && (
          <Text style={styles.text}>
            {sending
              ? 'Keep Verus Mobile open.'
              : 'Checking balance and network fees.'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

// Takes the loader's place when the data it waited for did not load.
export const InvoicePaymentError = ({title, message, onRetry, onClose}) => {
  const {styles} = useInvoiceStyles();
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <ProgressHeader
        borderless
        title="Pay invoice"
        progress={0.5}
        showBack={!!onClose}
        onBack={onClose}
      />
      <View style={styles.loading} accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={styles.loadingTitle}>
          {title}
        </Text>
        {!!message && <Text style={styles.text}>{message}</Text>}
      </View>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        <AppButton onPress={onRetry}>Try again</AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

// One short error line above a screen action.
export const InvoiceErrorLine = ({children}) => {
  const {theme, styles} = useInvoiceStyles();
  if (!children) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.footnote, {color: theme.colors.danger}]}>
      {children}
    </Text>
  );
};
