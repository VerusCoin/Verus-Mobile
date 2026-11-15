import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SemiModal from '../../../../../components/SemiModal';
import {buttonLabel, roundedButton} from '../../../../../styles/buttons.styles';
import {identityLabel} from '../IdentityRegistration/presentation';

const actions = [
  {value: 'transfer', title: 'Transfer identity', description: 'Choose a new owner', icon: 'account-arrow-right-outline'},
  {value: 'modify', title: 'Modify identity', description: 'Addresses, signers and authorities', icon: 'account-edit-outline'},
  {value: 'details', title: 'View details', description: 'See the identity’s current information', icon: 'card-account-details-outline'},
  {value: 'unlink', title: 'Unlink identity', description: 'Remove from this wallet', icon: 'link-off', destructive: true},
];

export default function IdentityActionsModal({selection, visible, onClose, onDismiss, onSelect}) {
  const {bottom} = useSafeAreaInsets();
  const name = identityLabel(selection.iAddress, {[selection.iAddress]: selection.displayName});
  return (
    <SemiModal
      visible={visible}
      animationType="slide"
      flexHeight={1.7}
      onRequestClose={onClose}
      onDismiss={onDismiss}
      contentContainerStyle={sheetStyles.sheet}>
      <View style={sheetStyles.header}>
        <View style={sheetStyles.heading}>
          <Text accessibilityRole="header" style={sheetStyles.name}>{name}</Text>
          <Text style={sheetStyles.chain}>{selection.chain}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close identity actions"
          disabled={!visible}
          onPress={onClose}
          style={({pressed}) => [sheetStyles.close, pressed && sheetStyles.pressed]}>
          <MaterialCommunityIcons name="close" size={22} color="#172033" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={sheetStyles.actions}>
        {actions.map(action => (
          <Pressable
            key={action.value}
            accessibilityRole="button"
            accessibilityLabel={`${action.title}, ${name}`}
            accessibilityHint={action.description}
            disabled={!visible}
            onPress={() => onSelect(action.value)}
            style={({pressed}) => [sheetStyles.action, pressed && sheetStyles.pressed]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={24}
              color={action.destructive ? '#b42318' : '#3165d4'}
            />
            <View style={sheetStyles.actionText}>
              <Text style={[sheetStyles.actionTitle, action.destructive && sheetStyles.destructive]}>{action.title}</Text>
              <Text style={sheetStyles.description}>{action.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#667085" />
          </Pressable>
        ))}
      </ScrollView>
      <View style={[sheetStyles.footer, {paddingBottom: Math.max(bottom, 16)}]}>
        <Pressable
          accessibilityRole="button"
          disabled={!visible}
          onPress={onClose}
          style={({pressed}) => [sheetStyles.cancel, pressed && sheetStyles.pressed]}>
          <Text style={sheetStyles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </SemiModal>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 0},
  header: {flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 16},
  heading: {flex: 1, paddingRight: 12},
  name: {fontSize: 21, lineHeight: 28, fontWeight: '700', color: '#172033'},
  chain: {fontSize: 14, lineHeight: 20, color: '#667085', marginTop: 4},
  close: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#eef0f3', alignItems: 'center', justifyContent: 'center'},
  actions: {paddingHorizontal: 16, paddingBottom: 8},
  action: {flexDirection: 'row', alignItems: 'center', minHeight: 72, padding: 14, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e3e7ed'},
  actionText: {flex: 1, paddingHorizontal: 12},
  actionTitle: {fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#172033'},
  description: {fontSize: 14, lineHeight: 20, color: '#667085', marginTop: 3},
  destructive: {color: '#b42318'},
  footer: {paddingTop: 8, paddingHorizontal: 16},
  cancel: {...roundedButton, minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#edf3ff'},
  cancelLabel: {...buttonLabel, color: '#3165d4'},
  pressed: {opacity: 0.65},
});
