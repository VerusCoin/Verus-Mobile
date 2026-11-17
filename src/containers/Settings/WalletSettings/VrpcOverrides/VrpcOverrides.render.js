import React from "react";
import {
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';
import SettingsFieldSheet from "../../components/SettingsFieldSheet";

const getServerSheetChips = function (sheet) {
  if (sheet.defaultServer) {
    return [{
      key: "default",
      icon: "restore",
      label: "Use default",
      accessibilityLabel: "Use the default server",
      onPress: ({setValue}) => setValue(sheet.defaultServer),
    }];
  }

  if (sheet.systemid) {
    return [{
      key: "remove",
      icon: "trash-can-outline",
      label: "Remove server",
      onPress: () => this.removeServer(),
    }];
  }

  return [];
};

export const VrpcOverridesRender = function () {
  const serverSheet = this.state.serverSheet;

  return (
    <>
      <SettingsScreen testID="settings.rpcServers">
        <SettingsSection title="RPC servers for systems">
        {Object.values(this.state.systems).map((system) => {
            return (
                <SettingsRow
                  description={system.display_name}
                  descriptionNumberOfLines={3}
                  icon="server-network"
                  key={system.system_id}
                  onPress={() => this.openServerSheet(system)}
                  title={this.getCurrentServer(system)}
                />
            );
          }) 
        }
        <SettingsRow
          icon="plus-circle-outline"
          last
          onPress={() => this.openAddServerSheet()}
          title="Add RPC server"
        />
        </SettingsSection>
        <SettingsNotice
          body="Blockchain data for every currency on a listed network is fetched from its server. Changes take effect after Verus Mobile restarts. Only connect to servers you trust."
          icon="alert-outline"
          title="Trust and restart required"
        />
      </SettingsScreen>
      {serverSheet ? (
        <SettingsFieldSheet
          busyText="Checking server…"
          chips={getServerSheetChips.call(this, serverSheet)}
          initialValue={serverSheet.initialValue}
          keyboardType="url"
          label="Server URL"
          monospace
          onClose={() => this.closeServerSheet()}
          onClosed={() => this.clearServerSheet()}
          onSave={value => this.saveServer(value)}
          placeholder="https://"
          saveAccessibilityLabel="Save server"
          title={serverSheet.title}
          visible={this.state.serverSheetVisible}
        />
      ) : null}
    </>
  );
};
