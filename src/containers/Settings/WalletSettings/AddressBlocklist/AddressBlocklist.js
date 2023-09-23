import { Component } from "react"
import { connect } from 'react-redux'
import { AddressBlocklistRender } from "./AddressBlocklist.render"
import { ADDRESS_BLOCKLIST_MANUAL } from "../../../../utils/constants/constants";
import { Alert } from "react-native";
import { saveGeneralSettings } from "../../../../actions/actionCreators";

const EDIT = 'edit'
const REMOVE = 'remove'

class AddressBlocklist extends Component {
  constructor() {
    super();
    this.state = {
      addressBlocklistSettings: {
        addressBlocklist: [],
        addressBlocklistDefinition: {
          type: ADDRESS_BLOCKLIST_MANUAL,
          data: null
        }
      },
      addBlockedAddressModal: {
        open: false,
        label: "",
        index: null
      },
      editPropertyModal: {
        open: false,
        label: "",
        index: null
      },
      loading: false
    };

    this.EDIT_PROPERTY_BUTTONS = [{
      key: EDIT,
      title: "Edit"
    }, {
      key: REMOVE,
      title: "Remove"
    }]
  }

  componentDidMount() {
    this.loadSettings()
  }

  closeAddBlockedAddressModal() {
    this.setState({
      addBlockedAddressModal: {
        open: false,
        label: "",
        index: null
      }
    })
  }

  closeEditPropertyModal() {
    this.setState({
      editPropertyModal: {
        open: false,
        label: "",
        index: null
      }
    })
  }

  openEditPropertyModal(label, index = null) {
    this.setState({
      editPropertyModal: {
        open: true,
        label,
        index
      }
    })
  }

  selectEditPropertyButton(button) {
    switch (button) {
      case EDIT:
        this.setState({
          addBlockedAddressModal: {
            open: true,
            label: "Edit Blocked Address",
            index: this.state.editPropertyModal.index
          }
        })
        break;
      case REMOVE:
        this.removeBlockedAddress(this.state.editPropertyModal.index)
        break;
      default:
        break;
    }
  }

  componentDidUpdate(lastProps) {
    if (lastProps.settings !== this.props.settings) {
      this.loadSettings()
    }
  }

  finishEditBlockedAddress(blockedAddress, index) {
    this.setState({
      addBlockedAddressModal: {
        open: false,
        label: "",
        index: null
      }
    }, () => this.editBlockedAddress({ address: blockedAddress, details: '', lastModified: Math.floor(Date.now() / 1000) }, index))
  }

  editBlockedAddress(address, index) {
    let addressBlocklist = this.state.addressBlocklistSettings.addressBlocklist ? this.state.addressBlocklistSettings.addressBlocklist : []

    if (index == null) {
      this.updateBlockedAddressList([...addressBlocklist, address])
    } else {
      addressBlocklist[index] = address
      this.updateBlockedAddressList(addressBlocklist)
    }
  }

  removeBlockedAddress(index) {
    let addressBlocklist = this.state.addressBlocklistSettings.addressBlocklist ? this.state.addressBlocklistSettings.addressBlocklist : []
    addressBlocklist.splice(index, 1);
    this.updateBlockedAddressList(addressBlocklist)
  }

  openAddBlockedAddressModal() {
    this.setState({
      addBlockedAddressModal: {
        open: true,
        label: "Block Address",
        index: null
      }
    })
  }

  updateBlockedAddressList(list) {
    this.setState(
      { addressBlocklistSettings: { ...this.state.addressBlocklistSettings, addressBlocklist: list }, loading: true },
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
      addressBlocklistDefinition: this.state.addressBlocklistSettings.addressBlocklistDefinition,
      addressBlocklist: this.state.addressBlocklistSettings.addressBlocklist,
    };

    const res = await saveGeneralSettings(stateChanges);
    this.props.dispatch(res);
  };

  loadSettings() {
    this.setState({
      addressBlocklistSettings: {
        addressBlocklist: this.props.settings.addressBlocklist == null ? [] : this.props.settings.addressBlocklist,
        addressBlocklistDefinition: this.props.settings.addressBlocklistDefinition == null ? {
          type: ADDRESS_BLOCKLIST_MANUAL,
          data: null
        } : this.props.settings.addressBlocklistDefinition
      }
    })
  }

  render() {
    return AddressBlocklistRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    settings: state.settings.generalWalletSettings
  }
};

export default connect(mapStateToProps)(AddressBlocklist);