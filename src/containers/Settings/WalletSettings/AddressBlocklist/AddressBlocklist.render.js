import React from 'react';
import {SafeAreaView, ScrollView} from 'react-native';
import {Divider, List, Portal} from 'react-native-paper';
import ListSelectionModal from '../../../../components/ListSelectionModal/ListSelectionModal';
import TextInputModal from '../../../../components/TextInputModal/TextInputModal';
import Styles from '../../../../styles';
import {unixToDate} from '../../../../utils/math';
import {
  ADDRESS_BLOCKLIST_MANUAL,
  DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER,
} from '../../../../utils/constants/constants';
import Colors from '../../../../globals/colors';

export const AddressBlocklistRender = function () {
  const blocklistType =
    this.state.addressBlocklistSettings.addressBlocklistDefinition.type;
  const {title: blocklistTypeTitle, description: blocklistTypeDescription} =
    this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS[blocklistType];

  return (
    <SafeAreaView
      style={[
        Styles.defaultRoot,
        {
          backgroundColor: this.props.darkMode
            ? Colors.darkModeColor
            : Colors.secondaryColor,
        },
      ]}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.addBlockedAddressModal.open && (
            <TextInputModal
              visible={this.state.addBlockedAddressModal.open}
              onChange={() => {}}
              cancel={text =>
                this.finishEditBlockedAddress(
                  text,
                  this.state.addBlockedAddressModal.index,
                )
              }
            />
          )}
          {this.state.editBlockDefinitionDataModal.open && (
            <TextInputModal
              visible={this.state.editBlockDefinitionDataModal.open}
              onChange={() => {}}
              cancel={text => this.finishEditBlockDefinitionData(text)}
            />
          )}
          {this.state.editPropertyModal.open && (
            <ListSelectionModal
              title={this.state.editPropertyModal.label}
              flexHeight={0.5}
              visible={this.state.editPropertyModal.open}
              onSelect={item => this.selectEditPropertyButton(item.key)}
              data={this.EDIT_PROPERTY_BUTTONS}
              cancel={() => this.closeEditPropertyModal()}
            />
          )}
          {this.state.selectBlockTypeModal.open && (
            <ListSelectionModal
              title={this.state.selectBlockTypeModal.label}
              flexHeight={0.5}
              visible={this.state.selectBlockTypeModal.open}
              onSelect={item => this.selectBlockTypeButton(item.key)}
              data={this.BLOCKLIST_TYPE_BUTTONS}
              cancel={() => this.closeSelectBlockTypeModal()}
            />
          )}
        </Portal>
        <Divider
          style={{
            backgroundColor: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.ultraLightGrey,
          }}
        />
        <List.Subheader
          style={{
            color: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.defaultGrayColor,
          }}>
          {'Address Blocklist Details'}
        </List.Subheader>
        <Divider
          style={{
            backgroundColor: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.ultraLightGrey,
          }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          descriptionStyle={{
            color: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.defaultGrayColor,
          }}
          title={blocklistTypeTitle}
          description={blocklistTypeDescription}
          onPress={() => this.openSelectBlockTypeModal(`Blocklist Type`)}
        />
        <Divider
          style={{
            backgroundColor: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.ultraLightGrey,
          }}
        />
        {blocklistType !== ADDRESS_BLOCKLIST_MANUAL && (
          <React.Fragment>
            <List.Item
              titleStyle={{
                color: this.props.darkMode ? Colors.secondaryColor : 'black',
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.verusDarkGray
                  : Colors.defaultGrayColor,
              }}
              title={
                this.state.addressBlocklistSettings.addressBlocklistDefinition
                  .data
                  ? this.state.addressBlocklistSettings
                      .addressBlocklistDefinition.data
                  : DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER
              }
              description={'Address blocklist source'}
              onPress={() => this.openEditBlockDefinitionDataModal()}
            />
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.verusDarkGray
                  : Colors.ultraLightGrey,
              }}
            />
          </React.Fragment>
        )}
        <List.Subheader
          style={{
            color: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.defaultGrayColor,
          }}>
          {'Blocked Addresses'}
        </List.Subheader>
        <Divider
          style={{
            backgroundColor: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.ultraLightGrey,
          }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          descriptionStyle={{
            color: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.defaultGrayColor,
          }}
          title={'Add blocked address'}
          right={props => <List.Icon {...props} 
          color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor}
          icon={'plus'} size={20} />}
          onPress={() => this.openAddBlockedAddressModal()}
        />
        <Divider
          style={{
            backgroundColor: this.props.darkMode
              ? Colors.verusDarkGray
              : Colors.ultraLightGrey,
          }}
        />
        {this.state.addressBlocklistSettings.addressBlocklist.map(
          (blockedAddress, index) => {
            return (
              <React.Fragment key={index}>
                <List.Item
                titleStyle={{
                  color: this.props.darkMode ? Colors.secondaryColor : 'black',
                }}
                descriptionStyle={{
                  color: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.defaultGrayColor,
                }}
                  key={index}
                  title={blockedAddress.address}
                  description={`Last modified ${unixToDate(
                    blockedAddress.lastModified,
                  )}`}
                  right={props => (
                    <List.Icon 
                    {...props} 
                    color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor}
                    icon={'account-edit'} size={20} />
                  )}
                  onPress={() =>
                    this.openEditPropertyModal(`Address ${index + 1}`, index)
                  }
                />
                <Divider
                  style={{
                    backgroundColor: this.props.darkMode
                      ? Colors.verusDarkGray
                      : Colors.ultraLightGrey,
                  }}
                />
              </React.Fragment>
            );
          },
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
