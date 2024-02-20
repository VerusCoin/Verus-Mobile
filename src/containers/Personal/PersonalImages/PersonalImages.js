import { Component } from "react"
import { connect } from 'react-redux'
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_IMAGES,
} from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalImagesRender } from "./PersonalImages.render"

class PersonalImages extends Component {
  constructor() {
    super();
    this.state = {
      images: {
        documents: [],
      },
      loading: false
    };
  }

  componentDidMount() {
    if (
      this.props.route.params != null &&
      this.props.route.params.customBack != null
    ) {
      provideCustomBackButton(
        this,
        this.props.route.params.customBack.route,
        this.props.route.params.customBack.params
      );
    }

    this.loadPersonalImages()
  }

  openEditImage(imageCategory, index) {
    this.props.navigation.navigate("PersonalImagesEditImage", {
      images: this.state.images,
      index,
      imageCategory
    })
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedImages !== this.props.encryptedImages) {
      this.loadPersonalImages();
    }
  }

  loadPersonalImages() {
    this.setState({loading: true}, async () => {
      this.setState({
        images: await requestPersonalData(PERSONAL_IMAGES),
        loading: false
      })
    })
  }

  render() {
    return PersonalImagesRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedImages: state.personal.images,
    darkMode:state.settings.darkModeState
  }
};

export default connect(mapStateToProps)(PersonalImages);