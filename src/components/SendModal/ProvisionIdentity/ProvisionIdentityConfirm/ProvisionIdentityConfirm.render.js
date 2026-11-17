import React from 'react';
import {ScrollView, View, SafeAreaView, TouchableOpacity} from 'react-native';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import {SEND_MODAL_IDENTITY_TO_PROVISION_FIELD} from '../../../../utils/constants/sendModal';
import {Divider, List, Button} from 'react-native-paper';
import {primitives} from 'verusid-ts-client';

export const ProvisionIdentityConfirmRender = function () {
  const {
    provAddress,
    provSystemId,
    provFqn,
    provParent,
    provWebhook,
    friendlyNameMap,
  } = this.state;

  const identity = provFqn
    ? provFqn.data
    : friendlyNameMap[
        this.props.sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]
      ]
    ? `${
        friendlyNameMap[
          this.props.sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]
        ]
      }@`
    : this.props.sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD];

  const parent = provParent != null && friendlyNameMap[provParent.data]
      ? friendlyNameMap[provParent.data]
      : provParent.data;
  
  const systemid = provSystemId != null && friendlyNameMap[provSystemId.data]
    ? friendlyNameMap[provSystemId.data]
    : provSystemId.data;

  return (
    <SafeAreaView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
      <ScrollView
        style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
        contentContainerStyle={{paddingBottom: 148}}>
        <Divider />
        <TouchableOpacity
          onPress={() =>
            copyToClipboard(identity, {
              title: 'Identity copied',
              message: `${identity} copied to clipboard.`,
            })
          }>
          <List.Item
            title={identity}
            description={'Identity'}
            titleNumberOfLines={100}
          />
          <Divider />
        </TouchableOpacity>
        <List.Item title={'5 minutes'} description={'Estimated waiting time'} />
        <Divider />
        {provAddress && (
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(provAddress.data, {
                title: 'Address copied',
                message: `${provAddress.data} copied to clipboard.`,
              })
            }>
            <List.Item
              title={provAddress.data}
              description={'Identity address'}
              titleNumberOfLines={100}
            />
            <Divider />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() =>
            copyToClipboard(this.state.primaryAddress, {
              title: 'Address copied',
              message: `${this.state.primaryAddress} copied to clipboard.`,
            })
          }>
          <List.Item
            title={this.state.primaryAddress}
            description={'Primary address (once received)'}
            titleNumberOfLines={100}
          />
          <Divider />
        </TouchableOpacity>
        {parent && (
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(parent, {
                title: 'Parent copied',
                message: `${parent} copied to clipboard.`,
              })
            }>
            <List.Item
              title={parent}
              description={'Identity parent'}
              titleNumberOfLines={100}
            />
            <Divider />
          </TouchableOpacity>
        )}
        {provFqn && (
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(provFqn.data, {
                title: 'Name copied',
                message: `${provFqn.data} copied to clipboard.`,
              })
            }>
            <List.Item
              title={provFqn.data}
              description={'Full identity name'}
              titleNumberOfLines={100}
            />
            <Divider />
          </TouchableOpacity>
        )}
        {systemid && (
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(systemid, {
                title: 'System ID copied',
                message: `${systemid} copied to clipboard.`,
              })
            }>
            <List.Item
              title={systemid}
              description={'Identity system ID'}
              titleNumberOfLines={100}
            />
            <Divider />
          </TouchableOpacity>
        )}
      </ScrollView>
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          position: 'absolute',
          bottom: 0,
          backgroundColor: 'white',
        }}>
        <Button
          textColor={Colors.warningButtonColor}
          style={{width: 148}}
          onPress={() => this.goBack()}>
          Back
        </Button>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{width: 148}}
          onPress={() => this.submitData()}>
          Request
        </Button>
      </View>
    </SafeAreaView>
  );
};
