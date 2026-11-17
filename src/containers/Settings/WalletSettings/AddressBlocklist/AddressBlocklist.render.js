import React from "react";
import {Clipboard} from "react-native";
import { unixToDate } from "../../../../utils/math";
import { ADDRESS_BLOCKLIST_MANUAL, DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER } from "../../../../utils/constants/constants";
import {
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';
import SettingsFieldSheet from "../../components/SettingsFieldSheet";
import BlockedAddressActionsSheet from "./BlockedAddressActionsSheet";
import BlocklistSourceSheet from "./BlocklistSourceSheet";

const PASTE_CHIP = {
  key: "paste",
  icon: "content-paste",
  label: "Paste",
  accessibilityLabel: "Paste address",
  onPress: async ({setValue}) => {
    const value = await Clipboard.getString();
    if (value) setValue(value.trim());
  },
};

const DEFAULT_SERVER_CHIP = {
  key: "default",
  icon: "restore",
  label: "Use default",
  accessibilityLabel: "Use the default server",
  onPress: ({setValue}) => setValue(DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER),
};

export const AddressBlocklistRender = function () {
  const blocklistType = this.state.addressBlocklistSettings.addressBlocklistDefinition.type;
  const { title: blocklistTypeTitle, description: blocklistTypeDescription } = this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS[blocklistType];
  const blocklist = this.state.addressBlocklistSettings.addressBlocklist;
  const addressSheet = this.state.addressSheet;
  const actionsIndex = this.state.addressActionsIndex;
  const actionsAddress =
    actionsIndex == null || blocklist[actionsIndex] == null
      ? ""
      : blocklist[actionsIndex].address;

  return (
    <>
      <SettingsScreen testID="settings.addressBlocklist">
        <SettingsSection title="Blocklist source">
          <SettingsRow
          description={blocklistTypeDescription}
          icon="format-list-bulleted-type"
          last={blocklistType === ADDRESS_BLOCKLIST_MANUAL}
          onPress={() => this.openSourceSheet()}
          title={blocklistTypeTitle}
          value="Type"
          />
        {
          blocklistType !== ADDRESS_BLOCKLIST_MANUAL && (
              <SettingsRow
                description="Address blocklist source"
                descriptionNumberOfLines={3}
                icon="server-network"
                last
                onPress={() => this.openServerSheet()}
                title={this.getBlocklistServer()}
              />
          )
        }
        </SettingsSection>
        <SettingsSection title="Blocked addresses">
          <SettingsRow
            icon="plus-circle-outline"
            last={blocklist.length === 0}
            onPress={() => this.openAddressSheet()}
            title="Add blocked address"
          />
        {blocklist.map((blockedAddress, index) => {
            return (
              <SettingsRow
                description={`Last modified ${unixToDate(blockedAddress.lastModified)}`}
                icon="shield-remove-outline"
                key={`${blockedAddress.address}-${index}`}
                last={index === blocklist.length - 1}
                onPress={() => this.openAddressActions(index)}
                title={blockedAddress.address}
              />
            );
          })
        }
        </SettingsSection>
        <SettingsNotice
          body="Addresses in this list remain blocked by the wallet's send flow. Editing a server source changes where the list is loaded from."
          title="Send protection"
        />
      </SettingsScreen>
      <BlocklistSourceSheet
        onClose={() => this.closeSourceSheet()}
        onSelect={type => this.selectBlockType(type)}
        options={this.BLOCKLIST_TYPE_OPTIONS.map(type => ({
          type,
          ...this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS[type],
        }))}
        selectedType={blocklistType}
        visible={this.state.sourceSheetVisible}
      />
      <BlockedAddressActionsSheet
        address={actionsAddress}
        onClose={() => this.closeAddressActions()}
        onClosed={() => this.clearAddressActions()}
        onEdit={() => this.openAddressSheet(actionsIndex)}
        onRemove={() => this.confirmRemoveBlockedAddress(actionsIndex)}
        visible={this.state.addressActionsVisible}
      />
      {addressSheet ? (
        <SettingsFieldSheet
          chips={[PASTE_CHIP]}
          initialValue={addressSheet.initialValue}
          label="Address"
          monospace
          onClose={() => this.closeAddressSheet()}
          onClosed={() => this.clearAddressSheet()}
          onSave={value => this.saveBlockedAddress(value)}
          placeholder="Enter an address"
          saveAccessibilityLabel="Save blocked address"
          title={addressSheet.title}
          visible={this.state.addressSheetVisible}
        />
      ) : null}
      {this.state.serverSheet ? (
        <SettingsFieldSheet
          chips={[DEFAULT_SERVER_CHIP]}
          initialValue={this.state.serverSheet.initialValue}
          keyboardType="url"
          label="Server URL"
          monospace
          onClose={() => this.closeServerSheet()}
          onClosed={() => this.clearServerSheet()}
          onSave={value => this.saveBlocklistServer(value)}
          placeholder="https://"
          saveAccessibilityLabel="Save blocklist server"
          title="Blocklist server"
          visible={this.state.serverSheetVisible}
        />
      ) : null}
    </>
  );
};
