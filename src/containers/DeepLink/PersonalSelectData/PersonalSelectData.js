import moment from "moment";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES, PERSONAL_BIRTHDAY, PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalSelectDataRender } from "./PersonalSelectData.render"

const EDIT = 'edit'
const REMOVE = 'remove'

class PersonalSelectData extends Component {
  constructor() {
    super();
    this.state = {
      attributes: {
        name: {
          first: "John",
          middle: "",
          last: "Doe"
        },
        birthday: {
          day: null,
          month: null,
          year: null
        },
        nationalities: []
      },
      nationalityModalOpen: false,
      birthdaySelectorModalOpen: false,
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      loading: false
    };

    // this.EDIT_PROPERTY_BUTTONS = [{
    //   key: EDIT,
    //   title: "Change"
    // }, {
    //   key: REMOVE,
    //   title: "Remove"
    // }]
    this.EDIT_PROPERTY_BUTTONS = [{
      key: REMOVE,
      title: "Remove"
    }]
  }

  componentDidMount() {
    if (this.props.route.params != null && this.props.route.params.customBack != null) {
      provideCustomBackButton(
        this,
        this.props.route.params.customBack.route,
        this.props.route.params.customBack.params
      );
    }

    this.loadPersonalAttributes()
  }

  loadPersonalAttributes() {
    this.setState({loading: true}, async () => {
      this.setState({
        attributes: await requestPersonalData(PERSONAL_ATTRIBUTES),
        loading: false
      })
    })
  }


  render() {
    return PersonalSelectDataRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedAttributes: state.personal.attributes
  }
};

export default connect(mapStateToProps)(PersonalSelectData);