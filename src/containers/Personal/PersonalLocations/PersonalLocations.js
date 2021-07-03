import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_LOCATIONS, PERSONAL_TAX_COUNTRIES,
} from "../../../utils/constants/personal";
import { PersonalLocationsRender } from "./PersonalLocations.render"

const EDIT = 'edit'
const REMOVE = 'remove'

class PersonalLocations extends Component {
  constructor() {
    super();
    this.state = {
      locations: {
        physical_addresses: [],
        tax_countries: [],
      },
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null,
      },
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      loading: false,
    };

    this.EDIT_PROPERTY_BUTTONS = [{
      key: EDIT,
      title: "Edit"
    }, {
      key: REMOVE,
      title: "Remove"
    }]
  }

  openEditAddress(index) {
    this.props.navigation.navigate("PersonalLocationsEditAddress", {
      locations: this.state.locations,
      index
    })
  }

  closeEditPropertyModal() {
    this.setState({
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      }
    })
  }

  selectEditPropertyButton(button) {
    switch (this.state.editPropertyModal.property) {
      case PERSONAL_TAX_COUNTRIES:
        switch (button) {
          case EDIT:
            this.setState({
              addPropertyModal: {
                open: true,
                property: PERSONAL_TAX_COUNTRIES,
                label: "Edit Tax Country",
                index: this.state.editPropertyModal.index
              }
            })
            break;
          case REMOVE:
            this.removeTaxCountry(this.state.editPropertyModal.index)
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
  }

  openEditPropertyModal(label, property, index = null) {
    this.setState({
      editPropertyModal: {
        open: true,
        property,
        label,
        index
      }
    })
  }

  updateLocations(key, value) {
    this.setState(
      { locations: { ...this.state.locations, [key]: value }, loading: true },
      async () => {
        await modifyPersonalDataForUser(
          this.state.locations,
          PERSONAL_LOCATIONS,
          this.props.activeAccount.accountHash
        );

        this.setState({ loading: false });
      }
    );
  }

  editTaxCountry(code, index) {
    let taxCountries = this.state.locations.tax_countries ? this.state.locations.tax_countries : []

    if (index == null) {
      this.updateLocations(PERSONAL_TAX_COUNTRIES, [...taxCountries, code])
    } else {
      taxCountries[index] = code
      this.updateLocations(PERSONAL_TAX_COUNTRIES, taxCountries)
    }
  }

  removeTaxCountry(index) {
    let countries = this.state.locations.tax_countries ? this.state.locations.tax_countries : []
    countries.splice(index, 1);
    this.updateLocations(PERSONAL_TAX_COUNTRIES, countries)
  }

  clearAddPropertyModal() {
    this.setState({
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null,
      },
    });
  }

  openTaxCountryModal(index) {
    this.setState({
      addPropertyModal: {
        open: true,
        property: PERSONAL_TAX_COUNTRIES,
        label: "Select a Country",
        index,
      },
    });
  }

  componentDidMount() {
    this.loadPersonalLocations();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedLocations !== this.props.encryptedLocations) {
      this.loadPersonalLocations();
    }
  }

  loadPersonalLocations() {
    this.setState({ loading: true }, async () => {
      this.setState({
        locations: await requestPersonalData(PERSONAL_LOCATIONS),
        loading: false,
      });
    });
  }

  render() {
    return PersonalLocationsRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedLocations: state.personal.locations
  }
};

export default connect(mapStateToProps)(PersonalLocations);