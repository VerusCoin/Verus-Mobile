/* eslint-disable react/prop-types */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Colors from '../../../globals/colors';

const friendlyErrorRules = [
  {
    test: (message) => message.includes('insufficient') || message.includes('no spendable plain'),
    title: 'More funds needed',
    message:
      'This wallet does not have enough spendable funds for the network fee or listing deposit. Add funds to this wallet, wait for sync, then try again.',
  },
  {
    test: (message) => message.includes('expired'),
    title: 'Request expired',
    message:
      'This marketplace request has expired. Return to the marketplace and start the action again.',
  },
  {
    test: (message) => message.includes('response uri') || message.includes('invalid or expired token'),
    title: 'Return link failed',
    message:
      'The wallet could not return the signed result to the marketplace. Go back to the marketplace and retry from the current listing.',
  },
  {
    test: (message) => message.includes('broadcast') || message.includes('failed-precheck'),
    title: 'Network rejected the transaction',
    message:
      'The network did not accept this transaction. Let the wallet finish syncing, then retry. If it fails again, recreate the marketplace request.',
  },
  {
    test: (message) => (
      message.includes('different address')
      || message.includes('does not match')
      || message.includes('moved since')
      || message.includes('malformed')
    ),
    title: 'Listing changed',
    message:
      'The listing no longer matches the marketplace request. Return to the marketplace, refresh the listing, and start again.',
  },
  {
    test: (message) => message.includes('does not own'),
    title: 'Wrong wallet selected',
    message:
      'This wallet does not control the asset or listing for this request. Switch to the wallet that owns it and try again.',
  },
];

export function getMarketplaceActionError(error, fallbackMessage) {
  const rawMessage = error && error.message ? error.message : fallbackMessage;
  const normalized = String(rawMessage || '').toLowerCase();
  const match = friendlyErrorRules.find((rule) => rule.test(normalized));

  if (match) {
    return {
      title: match.title,
      message: match.message,
    };
  }

  return {
    title: 'Action could not finish',
    message:
      fallbackMessage || 'The marketplace action could not finish. Check wallet sync and try again.',
  };
}

const MarketplaceActionStatus = ({
  title,
  message,
  steps = [],
  activeIndex = 0,
  error = false,
  onRetry,
  onCancel,
}) => (
  <View style={styles.container}>
    <View style={styles.card}>
      {!error && <ActivityIndicator size="large" color={Colors.primaryColor} />}
      <Text style={[styles.title, error ? styles.errorTitle : null]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {steps.length > 0 && (
        <View style={styles.steps}>
          {steps.map((step, index) => {
            const complete = index < activeIndex;
            const active = index === activeIndex;
            return (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    complete ? styles.stepDotComplete : null,
                    active && !error ? styles.stepDotActive : null,
                    active && error ? styles.stepDotError : null,
                  ]}
                />
                <Text
                  style={[
                    styles.stepText,
                    complete || active ? styles.stepTextActive : null,
                    active && error ? styles.stepTextError : null,
                  ]}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {error && (
        <View style={styles.actions}>
          {onCancel ? (
            <Button mode="text" color={Colors.warningButtonColor} onPress={onCancel}>
              Back
            </Button>
          ) : null}
          {onRetry ? (
            <Button mode="contained" color={Colors.primaryColor} onPress={onRetry}>
              Try Again
            </Button>
          ) : null}
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorTitle: {
    color: Colors.warningButtonColor,
    marginTop: 0,
  },
  message: {
    color: Colors.verusDarkGray,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  steps: {
    marginTop: 18,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  stepDot: {
    backgroundColor: '#D8D8D8',
    borderRadius: 6,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  stepDotActive: {
    backgroundColor: Colors.primaryColor,
  },
  stepDotComplete: {
    backgroundColor: Colors.verusGreenColor,
  },
  stepDotError: {
    backgroundColor: Colors.warningButtonColor,
  },
  stepText: {
    color: '#888888',
    flex: 1,
    fontSize: 14,
  },
  stepTextActive: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  stepTextError: {
    color: Colors.warningButtonColor,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
});

export default MarketplaceActionStatus;
