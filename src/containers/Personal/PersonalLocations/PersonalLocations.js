import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_LOCATIONS, PERSONAL_TAX_COUNTRIES,
} from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
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

  openEditTaxCountry(index) {
    this.props.navigation.navigate("PersonalLocationsEditTaxCountry", {
      locations: this.state.locations,
      index
    })
  }

  componentDidMount() {
    if (this.props.route.params != null && this.props.route.params.customBack != null) {
      provideCustomBackButton(
        this,
        this.props.route.params.customBack.route,
        this.props.route.params.customBack.params
      );
    }

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
    encryptedLocations: state.personal.locations,
    darkMode:state.settings.darkModeState
  }
};

export default connect(mapStateToProps)(PersonalLocations);