import { Component } from "react"
import { connect } from 'react-redux'
import { AddressBlocklistRender } from "./AddressBlocklist.render"
import { ADDRESS_BLOCKLIST_FROM_VERUSID, ADDRESS_BLOCKLIST_FROM_WEBSERVER, ADDRESS_BLOCKLIST_MANUAL, DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER } from "../../../../utils/constants/constants";
import { saveGeneralSettings } from "../../../../actions/actionCreators";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";

const BLOCKLIST_ERRORS = {
  duplicate: "This address is already blocked.",
  invalidUrl: "Enter a valid server URL.",
};

const isServerUrl = value => /^https?:\/\/[^\s/?#]+/i.test(value);

class AddressBlocklist extends Component {
  constructor() {
    super();
    this.state = {
      addressBlocklistSettings: {
        addressBlocklist: [],
        addressBlocklistDefinition: {
          type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
          data: null
        }
      },
      // Sheet content stays while a sheet closes; visibility is separate.
      // index is null when the user adds an address.
      addressSheet: null,
      addressSheetVisible: false,
      addressActionsIndex: null,
      addressActionsVisible: false,
      sourceSheetVisible: false,
      serverSheet: null,
      serverSheetVisible: false,
      loading: false
    };

    this.BLOCKLIST_TYPE_OPTIONS = [ADDRESS_BLOCKLIST_FROM_WEBSERVER, ADDRESS_BLOCKLIST_MANUAL]

    this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS = {
      [ADDRESS_BLOCKLIST_FROM_WEBSERVER]: {
        title: 'Server',
        description: 'On login, your blocklist will be fetched from the internet'
      },
      [ADDRESS_BLOCKLIST_MANUAL]: {
        title: 'Manual',
        description: 'You set your address blocklist manually'
      },
      [ADDRESS_BLOCKLIST_FROM_VERUSID]: {
        title: 'VerusID',
        description: ''
      }
    }
  }

  componentDidMount() {
    this.loadSettings()
  }

  componentDidUpdate(lastProps) {
    if (lastProps.settings !== this.props.settings) {
      this.loadSettings()
    }
  }

  getBlocklist() {
    return this.state.addressBlocklistSettings.addressBlocklist ? this.state.addressBlocklistSettings.addressBlocklist : []
  }

  // Blocklist source

  openSourceSheet() {
    this.setState({ sourceSheetVisible: true })
  }

  closeSourceSheet() {
    this.setState({ sourceSheetVisible: false })
  }

  // The current type changes nothing. A new type keeps the blocked addresses.
  selectBlockType(type) {
    const { addressBlocklistDefinition } = this.state.addressBlocklistSettings

    if (type === addressBlocklistDefinition.type) return

    this.persistBlocklistSettings({
      addressBlocklist: this.getBlocklist(),
      addressBlocklistDefinition: { type, data: null }
    })
  }

  // Blocked address actions

  openAddressActions(index) {
    this.setState({ addressActionsIndex: index, addressActionsVisible: true })
  }

  closeAddressActions() {
    this.setState({ addressActionsVisible: false })
  }

  clearAddressActions() {
    this.setState({ addressActionsIndex: null })
  }

  async confirmRemoveBlockedAddress(index) {
    const blocked = this.getBlocklist()[index]

    if (blocked == null) return

    const confirmed = await createAlert(
      "Remove this address?",
      "The wallet no longer blocks sends to it.",
      [
        { text: "Remove", onPress: () => resolveAlert(true) },
        { text: "Not now", style: "cancel", onPress: () => resolveAlert(false) },
      ]
    )

    if (!confirmed) return

    // The list can change while the alert shows. Remove the same entry once.
    const blocklist = this.getBlocklist()
    let removeIndex = blocklist.indexOf(blocked)

    if (removeIndex < 0) removeIndex = blocklist.findIndex(item => item.address === blocked.address)
    if (removeIndex < 0) return

    const addressBlocklist = blocklist.filter((_, itemIndex) => itemIndex !== removeIndex)

    this.persistBlocklistSettings({
      ...this.state.addressBlocklistSettings,
      addressBlocklist
    })
  }

  // Add or edit a blocked address

  openAddressSheet(index = null) {
    const blocked = index == null ? null : this.getBlocklist()[index]

    this.setState({
      addressSheet: {
        index,
        title: index == null ? "Block address" : "Edit blocked address",
        initialValue: blocked ? blocked.address : ""
      },
      addressSheetVisible: true
    })
  }

  closeAddressSheet() {
    this.setState({ addressSheetVisible: false })
  }

  clearAddressSheet() {
    this.setState({ addressSheet: null })
  }

  // Returns an error string, true when the sheet closes, or false when a
  // save alert shows.
  async saveBlockedAddress(address) {
    const sheet = this.state.addressSheet

    if (!sheet) return false

    const { index, initialValue } = sheet

    if (index != null && address === initialValue) {
      this.closeAddressSheet()
      return true
    }

    const blocklist = this.getBlocklist()

    if (blocklist.some((item, itemIndex) => itemIndex !== index && item.address === address)) {
      return BLOCKLIST_ERRORS.duplicate
    }

    const blocked = { address, details: '', lastModified: Math.floor(Date.now() / 1000) }
    const addressBlocklist = [...blocklist]

    if (index == null) {
      addressBlocklist.push(blocked)
    } else {
      addressBlocklist[index] = blocked
    }

    const saved = await this.persistBlocklistSettings({
      ...this.state.addressBlocklistSettings,
      addressBlocklist
    })

    if (saved) this.closeAddressSheet()

    return saved
  }

  // Blocklist server

  openServerSheet() {
    this.setState({
      serverSheet: { initialValue: this.getBlocklistServer() },
      serverSheetVisible: true
    })
  }

  closeServerSheet() {
    this.setState({ serverSheetVisible: false })
  }

  clearServerSheet() {
    this.setState({ serverSheet: null })
  }

  getBlocklistServer() {
    const { data } = this.state.addressBlocklistSettings.addressBlocklistDefinition

    return data ? data : DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER
  }

  async saveBlocklistServer(server) {
    if (server === this.getBlocklistServer()) {
      this.closeServerSheet()
      return true
    }

    if (!isServerUrl(server)) return BLOCKLIST_ERRORS.invalidUrl

    const saved = await this.persistBlocklistSettings({
      addressBlocklist: this.getBlocklist(),
      addressBlocklistDefinition: {
        type: this.state.addressBlocklistSettings.addressBlocklistDefinition.type,
        data: server === DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER ? null : server
      }
    })

    if (saved) this.closeServerSheet()

    return saved
  }

  // Resolves to true when the settings are saved. On failure the screen shows
  // the stored settings again and an alert explains what to do.
  persistBlocklistSettings(addressBlocklistSettings) {
    return new Promise(resolve => {
      this.setState(
        { addressBlocklistSettings, loading: true },
        async () => {
          let saved = true

          try {
            await this.saveSettings()
          } catch(e) {
            saved = false
            console.warn(`Failed to save address blocklist: ${e && e.message ? e.message : e}`)
            this.loadSettings()
            createAlert(
              "Blocklist not saved",
              "The wallet could not save this change. Try again."
            )
          }

          this.setState({ loading: false });
          resolve(saved)
        }
      );
    })
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
          type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
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
