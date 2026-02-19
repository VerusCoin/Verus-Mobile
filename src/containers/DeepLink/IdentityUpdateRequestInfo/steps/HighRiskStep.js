/*
  HighRiskStep (Step 2)
  - 2026-02-05: Created. Shows each high-risk identity change (primary address,
    revocation/recovery authority, status) as warning cards with a checkbox.
    The user must acknowledge high-risk changes before proceeding.
  - 2026-02-06: Lean redesign — outcome-first card with compact change summary.
    Addresses and verbose warnings hidden behind "View details" to reduce
    cognitive load for regular users while keeping info accessible for power users.
  - 2026-02-07: Fixed misleading outcome card. Primary address ownership info
    is now only shown when primary addresses are actually changing.
  - 2026-02-07: Redesigned authority-only changes. When only revocation/recovery
    authority changes, shows a clean card with the authority type as label and
    the target ID name prominently. Info icon opens AuthorityInfoSheet explaining
    what the authority is. Summary card and details toggle hidden for authority-only.
*/
import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Checkbox, Portal, Text } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { VERUSID_REVOCATION_AUTH, VERUSID_RECOVERY_AUTH } from '../../../../utils/constants/verusidObjectData';
import AuthorityInfoSheet from '../components/AuthorityInfoSheet';

const HighRiskStep = ({
  highRiskChanges,
  primaryAddressAfterUpdateInfo,
  acknowledged,
  onToggle,
  hasUnownedPrimaryAddress,
  currentAuthorities,
  styles: parentStyles,
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [authorityInfoVisible, setAuthorityInfoVisible] = useState(false);

  const hasPrimaryInfo =
    primaryAddressAfterUpdateInfo != null &&
    Array.isArray(primaryAddressAfterUpdateInfo.addresses) &&
    primaryAddressAfterUpdateInfo.addresses.length > 0;

  const walletCount = primaryAddressAfterUpdateInfo?.walletCount ?? 0;
  const externalCount = primaryAddressAfterUpdateInfo?.externalCount ?? 0;

  // Extract authority changes for the dedicated authority card
  const authorityChanges = useMemo(() => {
    const revocation = (highRiskChanges || []).find(c => c.key === VERUSID_REVOCATION_AUTH.key);
    const recovery = (highRiskChanges || []).find(c => c.key === VERUSID_RECOVERY_AUTH.key);
    return { revocation, recovery };
  }, [highRiskChanges]);

  const isAuthorityOnly = !hasPrimaryInfo && (authorityChanges.revocation || authorityChanges.recovery);

  // Determine info sheet type based on which authorities are changing
  const authorityInfoType = useMemo(() => {
    if (authorityChanges.revocation && authorityChanges.recovery) return 'both';
    if (authorityChanges.recovery) return 'recovery';
    return 'revocation';
  }, [authorityChanges]);

  const outcome = useMemo(() => {
    // Primary address change outcomes
    if (hasPrimaryInfo) {
      if (walletCount === 0) {
        return {
          icon: 'shield-alert-outline',
          color: Colors.warningButtonColor,
          title: 'You will lose control of this ID',
          description: 'None of the primary addresses will be in your wallet.',
        };
      }

      if (externalCount > 0) {
        return {
          icon: 'shield-alert-outline',
          color: Colors.infoButtonColor,
          title: 'You will share control',
          description: 'An external address will also control this identity.',
        };
      }

      return {
        icon: 'shield-check-outline',
        color: Colors.primaryColor,
        title: 'You will still control this ID',
        description: 'All primary addresses are in your wallet.',
      };
    }

    // Fallback for non-authority, non-primary changes (e.g. status)
    return {
      icon: 'shield-alert-outline',
      color: Colors.infoButtonColor,
      title: 'Review required',
      description: 'These changes can affect who controls this identity.',
    };
  }, [hasPrimaryInfo, walletCount, externalCount]);

  /* Build a compact, plain-language summary of what's changing */
  const changeSummaryLines = useMemo(() => {
    return (highRiskChanges || []).map(change => {
      const isExternal = change?.type === 'primary-add' && change?.walletMatch === false;
      return {
        key: change.key,
        title: change.title,
        isExternal,
        type: change.type,
        data: change.data,
        valueLabel: change.valueLabel,
      };
    });
  }, [highRiskChanges]);

  const renderOutlinedBadge = ({ icon, label, color, style, size }) => {
    const isLarge = size === 'lg';
    return (
      <View
        style={[
          isLarge ? localStyles.badgeLg : localStyles.badge,
          { borderColor: color },
          style,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={isLarge ? 14 : 12}
          color={color}
          style={isLarge ? localStyles.badgeIconLg : localStyles.badgeIcon}
        />
        <Text style={[isLarge ? localStyles.badgeTextLg : localStyles.badgeText, { color }]}>
          {label}
        </Text>
      </View>
    );
  };

  const renderOwnershipBadge = ({ inWallet, style }) => {
    const color = inWallet ? Colors.primaryColor : Colors.infoButtonColor;
    const label = inWallet ? 'In wallet' : 'External';
    const icon = inWallet ? 'wallet-outline' : 'earth';
    return renderOutlinedBadge({ icon, label, color, style });
  };

  return (
    <View style={localStyles.root}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={[parentStyles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={parentStyles.header}>
          <Text style={parentStyles.mainTitle}>High-risk changes</Text>
          <Text style={parentStyles.subtitle}>
            These changes can affect who controls this identity.
          </Text>
        </View>

        {/* Authority-only card — vertical connector from current -> new */}
        {isAuthorityOnly && (
          <View style={localStyles.authorityCard}>
            {authorityChanges.revocation && (
              <View style={authorityChanges.recovery ? localStyles.authorityRowBorder : undefined}>
                <View style={localStyles.authorityLabelRow}>
                  <MaterialCommunityIcons
                    name="shield-alert-outline"
                    size={18}
                    color={Colors.infoButtonColor}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={localStyles.authorityLabel}>Change revocation authority</Text>
                  <TouchableOpacity
                    onPress={() => setAuthorityInfoVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={localStyles.infoIconButton}
                  >
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color={Colors.primaryColor}
                    />
                  </TouchableOpacity>
                </View>

                <View style={localStyles.transitionContainer}>
                  {/* Vertical connector line */}
                  <View style={localStyles.connectorColumn}>
                    <View style={localStyles.connectorLine} />
                    <MaterialCommunityIcons name="chevron-down" size={14} color="#C0C0C0" />
                  </View>

                  {/* Values */}
                  <View style={localStyles.transitionValues}>
                    {currentAuthorities?.revocation && (
                      <Text style={localStyles.authorityCurrent} numberOfLines={1} ellipsizeMode="middle">
                        {currentAuthorities.revocation}
                      </Text>
                    )}
                    <Text style={localStyles.authorityTarget} selectable>
                      {authorityChanges.revocation.data}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {authorityChanges.recovery && (
              <View style={authorityChanges.revocation ? { paddingTop: 14 } : undefined}>
                <View style={localStyles.authorityLabelRow}>
                  <MaterialCommunityIcons
                    name="shield-alert-outline"
                    size={18}
                    color={Colors.infoButtonColor}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={localStyles.authorityLabel}>Change recovery authority</Text>
                  <TouchableOpacity
                    onPress={() => setAuthorityInfoVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={localStyles.infoIconButton}
                  >
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color={Colors.primaryColor}
                    />
                  </TouchableOpacity>
                </View>

                <View style={localStyles.transitionContainer}>
                  {/* Vertical connector line */}
                  <View style={localStyles.connectorColumn}>
                    <View style={localStyles.connectorLine} />
                    <MaterialCommunityIcons name="chevron-down" size={14} color="#C0C0C0" />
                  </View>

                  {/* Values */}
                  <View style={localStyles.transitionValues}>
                    {currentAuthorities?.recovery && (
                      <Text style={localStyles.authorityCurrent} numberOfLines={1} ellipsizeMode="middle">
                        {currentAuthorities.recovery}
                      </Text>
                    )}
                    <Text style={localStyles.authorityTarget} selectable>
                      {authorityChanges.recovery.data}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Generic outcome card — for primary address or other non-authority changes */}
        {!isAuthorityOnly && (
          <>
            <View style={localStyles.outcomeCard}>
              <View style={localStyles.outcomeHeaderRow}>
                <View style={[localStyles.outcomeIcon, { backgroundColor: `${outcome.color}20` }]}>
                  <MaterialCommunityIcons name={outcome.icon} size={22} color={outcome.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.outcomeTitle}>{outcome.title}</Text>
                  <Text style={localStyles.outcomeDesc}>{outcome.description}</Text>
                </View>
              </View>

              {hasPrimaryInfo && (
                <View style={localStyles.outcomeBadgeRow}>
                  {renderOutlinedBadge({
                    icon: 'wallet-outline',
                    label: `In wallet: ${walletCount}`,
                    color: Colors.primaryColor,
                    size: 'lg',
                  })}
                  {renderOutlinedBadge({
                    icon: 'earth',
                    label: `External: ${externalCount}`,
                    color: Colors.infoButtonColor,
                    size: 'lg',
                  })}
                </View>
              )}
            </View>

            {/* Compact change summary */}
            {changeSummaryLines.length > 0 && (
              <View style={localStyles.summaryCard}>
                {changeSummaryLines.map((line, idx) => (
                  <View
                    key={line.key}
                    style={[
                      localStyles.summaryRow,
                      idx < changeSummaryLines.length - 1 && localStyles.summaryRowBorder,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={line.type === 'primary-add' ? 'plus-circle-outline' : 'minus-circle-outline'}
                      size={18}
                      color={line.type === 'primary-add' ? Colors.infoButtonColor : Colors.warningButtonColor}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={localStyles.summaryText}>{line.title}</Text>
                    {line.isExternal && renderOwnershipBadge({ inWallet: false, style: { marginLeft: 8 } })}
                  </View>
                ))}
              </View>
            )}

            {/* View details — progressive disclosure for power users */}
            <TouchableOpacity
              style={localStyles.detailsToggle}
              onPress={() => setDetailsExpanded(x => !x)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View change details"
            >
              <MaterialCommunityIcons
                name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#888"
                style={{ marginRight: 5 }}
              />
              <Text style={localStyles.detailsToggleText}>
                {detailsExpanded ? 'Hide details' : 'View details'}
              </Text>
            </TouchableOpacity>

            {detailsExpanded && (
              <View style={localStyles.detailsCard}>
                {/* Addresses after update */}
                {hasPrimaryInfo && (
                  <View style={localStyles.detailsSection}>
                    <Text style={localStyles.detailsSectionTitle}>
                      Primary addresses after update
                    </Text>
                    {primaryAddressAfterUpdateInfo.addresses.map((item, idx) => (
                      <View
                        key={item.address}
                        style={[
                          localStyles.addressRow,
                          idx < primaryAddressAfterUpdateInfo.addresses.length - 1 &&
                            localStyles.addressRowBorder,
                        ]}
                      >
                        <Text
                          style={localStyles.addressText}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                          selectable
                        >
                          {item.displayAddress}
                        </Text>
                        {renderOwnershipBadge({ inWallet: item.inWallet, style: { marginLeft: 8 } })}
                      </View>
                    ))}
                  </View>
                )}

                {/* Per-change address values */}
                {changeSummaryLines.some(l => l.data != null) && (
                  <View style={[localStyles.detailsSection, hasPrimaryInfo && localStyles.detailsSectionBorder]}>
                    <Text style={localStyles.detailsSectionTitle}>Change values</Text>
                    {changeSummaryLines
                      .filter(l => l.data != null)
                      .map(line => (
                        <View key={`val-${line.key}`} style={localStyles.valueBlock}>
                          <Text style={localStyles.valueLabel}>
                            {line.valueLabel || line.title}
                          </Text>
                          <Text
                            style={localStyles.valueData}
                            numberOfLines={2}
                            ellipsizeMode="middle"
                            selectable
                          >
                            {line.data}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Sticky acknowledgment */}
      <View style={localStyles.stickyAck}>
        <TouchableOpacity
          style={localStyles.ackRow}
          onPress={onToggle}
          activeOpacity={0.75}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel="Acknowledge high-risk changes"
        >
          <Checkbox.Android
            status={acknowledged ? 'checked' : 'unchecked'}
            onPress={onToggle}
            color={Colors.primaryColor}
            uncheckedColor="#B0B0B0"
          />
          <View style={{ flex: 1 }}>
            <Text style={localStyles.ackTitle}>I understand these high-risk changes.</Text>
            {hasUnownedPrimaryAddress && (
              <Text style={localStyles.ackSubtitle}>Includes an external primary address.</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Portal>
        <AuthorityInfoSheet
          visible={authorityInfoVisible}
          onClose={() => setAuthorityInfoVisible(false)}
          type={authorityInfoType}
        />
      </Portal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Authority-only card ── */
  authorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  authorityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  infoIconButton: {
    marginLeft: 6,
    padding: 2,
  },
  transitionContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginLeft: 4,
  },
  connectorColumn: {
    alignItems: 'center',
    width: 14,
    marginRight: 10,
    paddingTop: 4,
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#D4D4D4',
    borderRadius: 1,
  },
  transitionValues: {
    flex: 1,
    justifyContent: 'space-between',
  },
  authorityCurrent: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    marginBottom: 6,
  },
  authorityTarget: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
  },
  authorityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    paddingBottom: 14,
  },

  /* ── Outcome card ── */
  outcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  outcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outcomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  outcomeDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 2,
  },

  /* ── Outlined badges ── */
  outcomeBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
  },
  badgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeIconLg: {
    marginRight: 6,
  },
  badgeTextLg: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Compact change summary ── */
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  /* ── Details toggle ── */
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },

  /* ── Details panel (progressive disclosure) ── */
  detailsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    marginBottom: 12,
  },
  detailsSection: {
    marginBottom: 4,
  },
  detailsSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 12,
    marginTop: 8,
  },
  detailsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addressRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  valueBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 10,
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  valueData: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  /* ── Sticky acknowledgment ── */
  stickyAck: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ackSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
});

export default HighRiskStep;
