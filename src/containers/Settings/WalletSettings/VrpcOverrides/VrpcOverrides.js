import { Component } from "react"
import { connect } from 'react-redux'
import { VrpcOverridesRender } from "./VrpcOverrides.render"
import { saveGeneralSettings } from "../../../../actions/actionCreators";
import { coinsList } from "../../../../utils/CoinData/CoinsList";
import { VerusdRpcInterface } from "verusd-rpc-ts-client";
import { timeout } from "../../../../utils/promises";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getAuthDataForUrl } from "../../../../utils/url";

const SERVER_ERRORS = {
  invalidUrl: "Enter a valid server URL.",
  unreachable: "Could not reach this server. Check the address.",
  otherNetwork: "This server runs another network.",
  listedNetwork: "This network is already listed. Edit its server instead.",
};

const isServerUrl = value => /^https?:\/\/[^\s/?#]+/i.test(value);

class VrpcOverrides extends Component {
  constructor() {
    super();

    this.DEFAULT_SYSTEMS = {
      [coinsList.VRSC.system_id]: coinsList.VRSC,
      [coinsList.VRSCTEST.system_id]: coinsList.VRSCTEST,
      [coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2.system_id]: coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2,
      [coinsList.iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP.system_id]: coinsList.iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP,
      [coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N.system_id]: coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N,
    };

    this.state = {
      vrpcOverridesSettings: {
        vrpcOverrides: {}
      },
      // The sheet content stays while the sheet closes. systemid is null when
      // the user adds a server for a new network.
      serverSheet: null,
      serverSheetVisible: false,
      systems: {
        ...this.DEFAULT_SYSTEMS
      }
    };
  }

  componentDidMount() {
    this.loadSettings();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.settings !== this.props.settings) {
      this.loadSettings();
    }
  }

  getCurrentServer(system) {
    const overrides = this.state.vrpcOverridesSettings.vrpcOverrides;

    return overrides && overrides[system.system_id]
      ? overrides[system.system_id][0]
      : system.vrpc_endpoints[0];
  }

  openServerSheet(system) {
    const defaultSystem = this.DEFAULT_SYSTEMS[system.system_id];
    const named = system.display_name && system.display_name !== system.system_id;

    this.setState({
      serverSheet: {
        systemid: system.system_id,
        title: named ? `${system.display_name} server` : "RPC server",
        initialValue: this.getCurrentServer(system),
        defaultServer: defaultSystem ? defaultSystem.vrpc_endpoints[0] : null,
      },
      serverSheetVisible: true
    });
  }

  openAddServerSheet() {
    this.setState({
      serverSheet: {
        systemid: null,
        title: "Add RPC server",
        initialValue: "",
        defaultServer: null,
      },
      serverSheetVisible: true
    });
  }

  closeServerSheet() {
    this.setState({ serverSheetVisible: false });
  }

  clearServerSheet() {
    this.setState({ serverSheet: null });
  }

  // Resolves to {chainid} or {error}. It never rejects: a bad URL, a network
  // error and the timeout all become a short message under the field.
  async checkServer(server) {
    if (!isServerUrl(server)) return { error: SERVER_ERRORS.invalidUrl };

    try {
      const authData = getAuthDataForUrl(server);
      const testInterface = new VerusdRpcInterface("", server, undefined, undefined, authData);
      const testResult = await timeout(10000, testInterface.getInfo());
      const chainid = testResult && testResult.result ? testResult.result.chainid : null;

      if (!chainid) {
        console.warn(
          `RPC server check failed: ${testResult && testResult.error ? testResult.error.message : "no chain ID"}`
        );
        return { error: SERVER_ERRORS.unreachable };
      }

      return { chainid };
    } catch (e) {
      console.warn(`RPC server check failed: ${e && e.message ? e.message : e}`);
      return { error: SERVER_ERRORS.unreachable };
    }
  }

  // Called by the server sheet. Returns an error string to show under the
  // field, true when the sheet closes, or false when a save alert shows.
  async saveServer(value) {
    const sheet = this.state.serverSheet;

    if (!sheet) return false;

    const server = value.trim();
    const { systemid, defaultServer, initialValue } = sheet;
    const vrpcOverrides = this.state.vrpcOverridesSettings.vrpcOverrides ? {...this.state.vrpcOverridesSettings.vrpcOverrides} : {};

    if (systemid && server === initialValue) {
      this.closeServerSheet();
      return true;
    }

    // The default server needs no check: this is "Reset to default".
    if (systemid && defaultServer && server === defaultServer) {
      delete vrpcOverrides[systemid];
      return this.saveAndClose(vrpcOverrides);
    }

    const { chainid, error } = await this.checkServer(server);

    if (error) return error;
    if (systemid && chainid !== systemid) return SERVER_ERRORS.otherNetwork;
    if (!systemid && this.state.systems.hasOwnProperty(chainid)) return SERVER_ERRORS.listedNetwork;

    vrpcOverrides[chainid] = [server];

    return this.saveAndClose(
      vrpcOverrides,
      systemid
        ? this.state.systems
        : {
            ...this.state.systems,
            [chainid]: {
              vrpc_endpoints: [server],
              system_id: chainid,
              display_name: chainid
            }
          }
    );
  }

  // A network that the user added has no default server. Removing its server
  // removes the network from the list, as "Reset to default" did.
  async removeServer() {
    const sheet = this.state.serverSheet;

    if (!sheet || !sheet.systemid) return;

    const confirmed = await createAlert(
      "Remove this server?",
      "The wallet stops using it after a restart.",
      [
        { text: "Remove", onPress: () => resolveAlert(true) },
        { text: "Not now", style: "cancel", onPress: () => resolveAlert(false) },
      ]
    );

    if (!confirmed || this.state.serverSheet !== sheet) return;

    const vrpcOverrides = this.state.vrpcOverridesSettings.vrpcOverrides ? {...this.state.vrpcOverridesSettings.vrpcOverrides} : {};

    delete vrpcOverrides[sheet.systemid];
    await this.saveAndClose(vrpcOverrides);
  }

  async saveAndClose(overrides, systems) {
    const saved = await this.updateVrpcOverrides(overrides, systems);

    if (saved) this.closeServerSheet();

    return saved;
  }

  // Resolves to true when the overrides are saved. On failure the list shows
  // the stored servers again and an alert explains what to do.
  updateVrpcOverrides(overrides, systems = this.state.systems) {
    return new Promise(resolve => {
      this.setState(
        { vrpcOverridesSettings: { ...this.state.vrpcOverridesSettings, vrpcOverrides: overrides }, systems },
        async () => {
          try {
            await this.saveSettings();
            resolve(true);
          } catch(e) {
            console.warn(`Failed to save RPC servers: ${e && e.message ? e.message : e}`);
            this.loadSettings();
            createAlert(
              "Server not saved",
              "The wallet could not save the RPC server. Try again."
            );
            resolve(false);
          }
        }
      );
    });
  }

  async saveSettings() {
    const stateChanges = {
      vrpcOverrides: this.state.vrpcOverridesSettings.vrpcOverrides,
    };

    const res = await saveGeneralSettings(stateChanges);
    this.props.dispatch(res);
  };

  loadSettings() {
    this.setState({
      vrpcOverridesSettings: {
        vrpcOverrides: this.props.settings.vrpcOverrides == null ? {} : this.props.settings.vrpcOverrides
      }
    }, () => this.loadSystems());
  }

  loadSystems() {
    let systems = {...this.state.systems};

    for (let systemid in this.state.vrpcOverridesSettings.vrpcOverrides) {
      if (!systems.hasOwnProperty(systemid)) {
        systems[systemid] = {
          vrpc_endpoints: this.state.vrpcOverridesSettings.vrpcOverrides[systemid],
          system_id: systemid,
          display_name: systemid
        }
      }
    }

    const todelete = [];

    for (let systemid in systems) {
      if (
        !this.DEFAULT_SYSTEMS.hasOwnProperty(systemid) && 
        !this.state.vrpcOverridesSettings.vrpcOverrides.hasOwnProperty(systemid)
      ) {
        todelete.push(systemid);
      }
    }

    for (let i = 0; i < todelete.length; i++) {
      delete systems[todelete[i]];
    }

    this.setState({
      systems
    });
  }

  render() {
    return VrpcOverridesRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    settings: state.settings.generalWalletSettings
  }
};

export default connect(mapStateToProps)(VrpcOverrides);
