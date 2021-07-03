import { NavigationActions } from "@react-navigation/compat";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { PERSONAL_LOCATIONS } from "../../../../utils/constants/personal";
import { PersonalLocationsEditAddressRender } from "./PersonalLocationsEditAddress.render"

class PersonalLocationsEditAddress extends Component {
  constructor(props) {
    super(props);
    const initialAddress =
      props.route.params.index != null &&
      props.route.params.locations.physical_addresses[
        props.route.params.index
      ] != null
        ? props.route.params.locations.physical_addresses[
            props.route.params.index
          ]
        : {
            street1: "",
            street2: "",
            city: "",
            state_province_region: "",
            postal_code: "",
            country: "",
          };

    this.state = {
      locations: props.route.params.locations,
      address: initialAddress,
      currentTextInputModal: null,
      loading: false,
      countryModalOpen: false,
      index: props.route.params.index
    };

    this.addressTextInputLabels = {
      street1: {
        title: "Address line 1",
        description: "Street address, company name, P.O. box",
        placeholder: "required"
      },
      street2: {
        title: "Address line 2",
        description: "Apartment number, unit, floor, etc.",
        placeholder: "optional"
      },
      city: {
        title: "City",
        placeholder: "required"
      },
      state_province_region: {
        title: "State/Province/Region",
        placeholder: "optional"
      },
      postal_code: {
        title: "ZIP/Postal Code",
        placeholder: "required"
      }
    }
  }

  updateAddress() {
    this.setState({ loading: true }, async () => {
      let addresses = this.state.locations.physical_addresses
      
      if (this.state.index == null) {
        addresses.push(this.state.address)
      } else {
        addresses[this.state.index] = this.state.address
      }

      await modifyPersonalDataForUser(
        {...this.state.locations, physical_addresses: addresses},
        PERSONAL_LOCATIONS,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
        index:
          this.state.index == null
            ? this.state.locations.physical_addresses.length - 1
            : this.state.index,
      });
    })
  }

  tryDeleteAddress() {
    createAlert(
      'Delete address?',
      'Are you sure you would like to remove this address from your personal profile?',
      [
        {text: 'No', onPress: () => {
          resolveAlert()
        }},
        {text: 'Yes', onPress: () => {
          this.deleteAddress()
          resolveAlert()
        }},
      ],
      {
        cancelable: false,
      },
    )
  }

  deleteAddress() {
    this.setState({ loading: true }, async () => {
      if (this.state.index != null) {
        let addresses = this.state.locations.physical_addresses
        addresses.splice(this.state.index, 1);
  
        await modifyPersonalDataForUser(
          {...this.state.locations, physical_addresses: addresses},
          PERSONAL_LOCATIONS,
          this.props.activeAccount.accountHash
        );
      }

      this.props.navigation.dispatch(NavigationActions.back())
    })
  }

  selectCountry(countryCode) {
    this.setState({
      address: {
        ...this.state.address,
        country: countryCode
      }
    }, () => this.updateAddress())
  }

  closeTextInputModal() {
    this.setState({currentTextInputModal: null}, () => {
      this.updateAddress()
    })
  }

  render() {
    return PersonalLocationsEditAddressRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(PersonalLocationsEditAddress);