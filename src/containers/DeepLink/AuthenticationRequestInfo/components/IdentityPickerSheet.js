/*
  IdentityPickerSheet
  - 2026-02-07: Created SendSourceSubwalletSheet-style bottom sheet for picking
    a linked VerusID during authentication requests. Groups identities by network,
    filters by request constraints, and returns selection to parent.
    - Changed selection accent from blue to verusGreenColor
    - Truncated i-address display to first 6 + last 6 chars
*/

import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../../globals/colors';
import SemiModal from '../../../../components/SemiModal';

const truncateAddress = (addr) => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const IdentityPickerSheet = ({
  visible,
  linkedIds,
  sortedIds,
  isIdentityAllowed,
  selectedIdentity,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = 16 + insets.bottom;

  if (!visible) return null;

  const hasIdentities = Object.keys(sortedIds).some(chainId =>
    sortedIds[chainId].some(iAddr => isIdentityAllowed(chainId, iAddr)),
  );

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        title="Select identity"
        flexHeight={0.01}
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          flex: 0,
          width: '100%',
          alignSelf: 'flex-end',
          paddingBottom,
          maxHeight: '70%',
        }}
      >
        <View>
          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              Choose a VerusID to authenticate with.
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.listContainer}>
              {!hasIdentities && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No matching identities found.
                  </Text>
                </View>
              )}

              {Object.keys(sortedIds).map(chainId => {
                const filteredIds = sortedIds[chainId].filter(iAddr =>
                  isIdentityAllowed(chainId, iAddr),
                );

                if (filteredIds.length === 0) return null;

                return (
                  <View key={chainId} style={styles.networkGroup}>
                    <View style={styles.networkHeader}>
                      <Text style={styles.networkHeaderText}>{chainId}</Text>
                    </View>

                    {filteredIds.map(iAddr => {
                      const friendlyName = linkedIds[chainId][iAddr];
                      const isSelected =
                        selectedIdentity &&
                        selectedIdentity.chainId === chainId &&
                        selectedIdentity.iAddress === iAddr;

                      return (
                        <TouchableOpacity
                          key={iAddr}
                          style={[
                            styles.identityCard,
                            isSelected && styles.identityCardSelected,
                          ]}
                          onPress={() => onSelect(chainId, iAddr, friendlyName)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.identityIconContainer}>
                            <MaterialCommunityIcons
                              name="account"
                              size={22}
                              color={isSelected ? Colors.verusGreenColor : '#666'}
                            />
                          </View>
                          <View style={styles.identityTextSection}>
                            <Text
                              style={[
                                styles.identityName,
                                isSelected && styles.identityNameSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {friendlyName}
                            </Text>
                            <Text
                              style={styles.identityAddress}
                              numberOfLines={1}
                            >
                              {truncateAddress(iAddr)}
                            </Text>
                          </View>

                          {isSelected ? (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={Colors.verusGreenColor}
                              style={styles.chevron}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={20}
                              color="#CCC"
                              style={styles.chevron}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SemiModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  description: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  networkGroup: {
    marginBottom: 20,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  networkHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  identityCardSelected: {
    backgroundColor: '#F0F9F1',
    borderWidth: 1,
    borderColor: Colors.verusGreenColor,
  },
  identityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  identityTextSection: {
    flex: 1,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  identityNameSelected: {
    color: Colors.verusGreenColor,
  },
  identityAddress: {
    fontSize: 12,
    color: '#888',
  },
  chevron: {
    marginLeft: 8,
  },
});

export default IdentityPickerSheet;
