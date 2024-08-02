import { Component } from "react"
import { connect } from 'react-redux'
import { VrpcOverridesRender } from "./VrpcOverrides.render"
import { Alert } from "react-native";
import { saveGeneralSettings } from "../../../../actions/actionCreators";
import { coinsList } from "../../../../utils/CoinData/CoinsList";
import { VerusdRpcInterface } from "verusd-rpc-ts-client";
import { timeout } from "../../../../utils/promises";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";

const EDIT = 'edit'
const RESET_TO_DEFAULT = 'default'

class VrpcOverrides extends Component {
  constructor() {
    super();

    this.DEFAULT_SYSTEMS = {
      [coinsList.VRSC.system_id]: coinsList.VRSC,
      [coinsList.VRSCTEST.system_id]: coinsList.VRSCTEST,
      [coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2.system_id]: coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2,
      [coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N.system_id]: coinsList.iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N,
    };

    this.state = {
      vrpcOverridesSettings: {
        vrpcOverrides: {}
      },
      editPropertyModal: {
        open: false,
        label: "",
        systemid: null
      },
      addVrpcOverrideModal: {
        open: false,
        label: "",
        systemid: null
      },
      systems: {
        ...this.DEFAULT_SYSTEMS
      },
      loading: false
    };

    this.EDIT_PROPERTY_BUTTONS = [{
      key: EDIT,
      title: "Edit"
    },
    {
      key: RESET_TO_DEFAULT,
      title: "Reset to default"
    }]
  }

  componentDidMount() {
    this.loadSettings();
  }

  closeEditPropertyModal() {
    this.setState({
      editPropertyModal: {
        open: false,
        label: "",
        systemid: null
      }
    })
  }

  openEditPropertyModal(label, systemid = null) {
    this.setState({
      editPropertyModal: {
        open: true,
        label,
        systemid
      }
    })
  }

  selectEditPropertyButton(button) {
    switch (button) {
      case EDIT:
        this.setState({
          addVrpcOverrideModal: {
            open: true,
            label: "Edit RPC Server",
            systemid: this.state.editPropertyModal.systemid
          }
        })
        break;
      case RESET_TO_DEFAULT:
        const systemid = this.state.editPropertyModal.systemid;

        this.setState({
          editPropertyModal: {
            open: false,
            label: "",
            systemid: null
          }
        }, () => this.editVrpcOverride(null, systemid))
        break;
      default:
        break;
    }
  }

  componentDidUpdate(lastProps) {
    if (lastProps.settings !== this.props.settings) {
      this.loadSettings();
    }
  }

  finishAddVrpcOverrideModal(server, systemid) {
    this.setState({
      addVrpcOverrideModal: {
        open: false,
        label: "",
        systemid: null
      }
    }, () => this.editVrpcOverride(server, systemid))
  }

  editVrpcOverride(server, systemid) {
    if (!server || server.length === 0) {
      let vrpcOverrides = this.state.vrpcOverridesSettings.vrpcOverrides ? {...this.state.vrpcOverridesSettings.vrpcOverrides} : {};

      delete vrpcOverrides[systemid];
      this.updateVrpcOverrides(vrpcOverrides);
    } else {
      this.setState({
        loading: true
      }, async () => {
        let vrpcOverrides = this.state.vrpcOverridesSettings.vrpcOverrides ? {...this.state.vrpcOverridesSettings.vrpcOverrides} : {};
        const testInterface = new VerusdRpcInterface("", server);
        const testResult = await timeout(10000, testInterface.getInfo());

        if (testResult.result && (testResult.result.chainid === systemid || !systemid)) {
          vrpcOverrides[testResult.result.chainid] = [server];

          if (!systemid && this.state.systems.hasOwnProperty(testResult.result.chainid)) {
            throw new Error("Cannot add another copy of existing system, edit the server for that system instead.")
          } else if (!systemid && !this.state.systems.hasOwnProperty(testResult.result.chainid)) {
            this.updateVrpcOverrides(vrpcOverrides, {
              ...this.state.systems,
              [testResult.result.chainid]: {
                vrpc_endpoints: [server],
                system_id: testResult.result.chainid,
                display_name: testResult.result.chainid
              }
            });
          } else {
            this.updateVrpcOverrides(vrpcOverrides);
          }
        } else {
          this.setState({
            loading: false
          }, () => createAlert(
            "Error", 
            (testResult.result && (testResult.result.chainid !== systemid)) ? 
              `RPC server appears to be for different system than requested (${testResult.result.chainid})` 
                : 
              "Failed to connect to the RPC server. Please check the server address and try again.")
            );
        }
      })
    }
  }

  openAddVrpcServerModal() {
    this.setState({
      addVrpcOverrideModal: {
        open: true,
        label: "Add RPC Server",
        systemid: null
      }
    })
  }

  updateVrpcOverrides(overrides, systems = this.state.systems) {
    this.setState(
      { vrpcOverridesSettings: { ...this.state.vrpcOverridesSettings, vrpcOverrides: overrides }, loading: true, systems },
      async () => {
        try {
          await this.saveSettings()
        } catch(e) {
          Alert.alert('Error', e.message)
        }

        this.setState({ loading: false });
      }
    );
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