import { NavigationActions } from "@react-navigation/compat";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import {
  PERSONAL_DOCUMENT_BANK_STATEMENT,
  PERSONAL_DOCUMENT_DRIVING_LICENSE,
  PERSONAL_DOCUMENT_GOVT_ID,
  PERSONAL_DOCUMENT_OTHER,
  PERSONAL_DOCUMENT_PASSPORT,
  PERSONAL_DOCUMENT_PASSPORT_CARD,
  PERSONAL_DOCUMENT_SUBTYPE_BACK,
  PERSONAL_DOCUMENT_SUBTYPE_FRONT,
  PERSONAL_DOCUMENT_UTILITY_BILL,
  PERSONAL_IMAGES,
  PERSONAL_IMAGES_DOCUMENTS,
  PERSONAL_IMAGE_TYPE_SCHEMA,
} from "../../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../../utils/navigation/customBack";
import { PersonalImagesEditImageRender } from "./PersonalImagesEditImage.render";
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { verifyPermissions } from "../../../../utils/permissions";
import { PERMISSIONS } from "react-native-permissions";

const getImageTypeOrders = (imageCategory) => {
  switch (imageCategory) {
    case PERSONAL_IMAGES_DOCUMENTS:
      return {
        typeOrder: [
          PERSONAL_DOCUMENT_PASSPORT,
          PERSONAL_DOCUMENT_PASSPORT_CARD,
          PERSONAL_DOCUMENT_DRIVING_LICENSE,
          PERSONAL_DOCUMENT_GOVT_ID,
          PERSONAL_DOCUMENT_BANK_STATEMENT,
          PERSONAL_DOCUMENT_UTILITY_BILL,
          PERSONAL_DOCUMENT_OTHER,
        ],
        typeLabel: "Document type",
        imageTextInputLabels: {
          description: {
            title: "Note",
            placeholder: "optional",
          },
        }
      }  
    default:
      return {
        typeOrder: [],
        subtypeOrder: []
      }
  }
}

class PersonalImagesEditImage extends Component {
  constructor(props) {
    super(props);
    const typeOrders = getImageTypeOrders(props.route.params.imageCategory);

    const initialImage =
      props.route.params.index != null &&
      props.route.params.imageCategory != null &&
      props.route.params.images[props.route.params.imageCategory][
        props.route.params.index
      ] != null
        ? props.route.params.images[props.route.params.imageCategory][
            props.route.params.index
          ]
        : {
            title: "",
            description: "",
            uris: [],
            image_type: null,
            image_subtype: null,
          };

    this.state = {
      images: props.route.params.images,
      image: initialImage,
      currentTextInputModal: null,
      loading: false,
      loadingImage: false,
      index: props.route.params.index,
      imageCategory: props.route.params.imageCategory,
      imageAddModalIndex: null,
      imageTypeModalOpen: false,
      imageEditModalIndex: null,
    };

    this.imageTextInputLabels = typeOrders.imageTextInputLabels;

    this.SELECT_PHOTO_FROM_LIBRARY = "select";
    this.TAKE_PHOTO = "camera";
    this.DOCUMENT_TYPES = this.addImageOptionOrder = [
      this.SELECT_PHOTO_FROM_LIBRARY,
      this.TAKE_PHOTO,
    ];

    this.addImageOptions = {
      [this.SELECT_PHOTO_FROM_LIBRARY]: {
        title: "Select an image from your photo library",
        key: this.SELECT_PHOTO_FROM_LIBRARY,
      },
      [this.TAKE_PHOTO]: {
        title: "Take a photo using your camera",
        key: this.TAKE_PHOTO,
      },
    };

    this.listSelectionLabels = {
      image_type: {
        title: typeOrders.typeLabel,
        placeholder: "select type",
      },
    };

    this.imageTypeOrder = typeOrders.typeOrder;
    this.imageSubtypeOrder = typeOrders.subtypeOrder;
    this.typeLabel = typeOrders.typeLabel;
    this.subtypeLabel = typeOrders.subtypeLabel;

    this.CHANGE = "change";
    this.REMOVE = "remove";

    this.IMAGE_EDIT_OPTIONS = [
      {
        key: this.CHANGE,
        title: "Change image",
      },
      {
        key: this.REMOVE,
        title: "Remove image",
      },
    ];
  }

  selectImageEditOption(key) {
    switch (key) {
      case this.CHANGE:
        this.setState({
          imageAddModalIndex: this.state.imageEditModalIndex,
          imageEditModalIndex: null,
        });
        break;
      case this.REMOVE:
        this.removeImage(this.state.imageEditModalIndex);
      default:
        break;
    }
  }

  addImage(addImageOption, index) {
    this.setState({ loadingImage: true, loading: true, imageAddModalIndex: null }, async () => {
      try {
        switch (addImageOption) {
          case this.SELECT_PHOTO_FROM_LIBRARY:
            const libraryPermissions = await verifyPermissions(
              PERMISSIONS.IOS.PHOTO_LIBRARY,
              PERMISSIONS.ANDROID.CAMERA
            );

            if (libraryPermissions.canUse) {
              launchImageLibrary({ mediaType: "photo", selectionLimit: 1 }, async (res) => {
                if (res.errorCode != null) {
                  console.warn(res);

                  if (res.errorCode === "camera_unavailable") {
                    createAlert(
                      "Error",
                      "Verus Mobile encountered a problem while trying to access your photo library"
                    );
                  }

                  this.setState({ loadingImage: false, loading: false });
                } else if (!res.didCancel) {
                  await this.updateUris(res.assets, index);
                } else {
                  this.setState({ loadingImage: false, loading: false });
                }
              });
            } else {
              createAlert("Error", "Verus Mobile cannot access your photo library");
              this.setState({ loadingImage: false, loading: false });
            }

            break;
          case this.TAKE_PHOTO:
            const cameraPermissions = await verifyPermissions(
              PERMISSIONS.IOS.CAMERA,
              PERMISSIONS.ANDROID.CAMERA
            );

            // Hack to prevent camera modal from bugging out and disappearing 
            // if camera options modal isn't fully hidden yet
            await (() => new Promise((resolve, reject) => {
              setTimeout(() => resolve(), 500)
            }))()

            if (cameraPermissions.canUse) {
              launchCamera(
                {
                  mediaType: "photo",
                  selectionLimit: 1,
                  saveToPhotos: false,
                },
                async (res) => {
                  if (res.errorCode != null) {
                    console.warn(res);

                    if (res.errorCode === "camera_unavailable") {
                      createAlert(
                        "Error",
                        "Verus Mobile encountered a problem while trying to open your camera"
                      );
                    }

                    this.setState({ loadingImage: false, loading: false });
                  } else if (!res.didCancel) {
                    await this.updateUris(res.assets, index);
                  } else {
                    this.setState({ loadingImage: false, loading: false });
                  }
                }
              );
            } else {
              createAlert("Error", "Verus Mobile cannot access your camera");
              this.setState({ loadingImage: false, loading: false });
            }
            break;
          default:
            break;
        }
      } catch (e) {
        console.warn(e);
        createAlert("Error", "Failed to load image");
        this.setState({ loadingImage: false, loading: false });
      }
    });
  }

  removeImage(index) {
    let uris = this.state.image.uris.slice();
    uris.splice(index, 1);

    this.setState(
      {
        image: {
          ...this.state.image,
          uris,
        },
      },
      () => {
        this.updateImage();
      }
    );
  }

  async updateUris(assets, index) {
    let uris = this.state.image.uris.slice();

    if (assets != null) {
      if (index != null) uris[index] = assets[0].uri;
      else if (index >= uris.length) uris.push(assets[0].uri);
    }

    this.setState(
      {
        image: {
          ...this.state.image,
          uris,
        },
      },
      () => {
        this.updateImage();
      }
    );
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
  }

  selectImageSubtype(subtype) {
    this.setState(
      {
        image: {
          ...this.state.image,
          image_subtype: subtype,
        },
      },
      () => {
        this.updateImage();
      }
    );
  }

  selectImageType(typeKey) {
    let imageUris = this.state.image.uris;

    if (
      PERSONAL_IMAGE_TYPE_SCHEMA[typeKey].images != null &&
      PERSONAL_IMAGE_TYPE_SCHEMA[typeKey].images.length <
        this.state.image.uris.length
    ) {
      imageUris = imageUris.slice(
        0,
        PERSONAL_IMAGE_TYPE_SCHEMA[typeKey].images.length
      );
    }

    this.setState(
      {
        image: {
          ...this.state.image,
          image_type: typeKey,
          uris: imageUris,
        },
      },
      () => {
        this.updateImage();
      }
    );
  }

  updateImage() {
    this.setState({ loading: true }, async () => {
      const { imageCategory } = this.state;
      let images = this.state.images[imageCategory];

      if (images == null) {
        images = [this.state.image];
      } else if (this.state.index == null) {
        images.push(this.state.image);
      } else {
        images[this.state.index] = this.state.image;
      }

      await modifyPersonalDataForUser(
        { ...this.state.images, [imageCategory]: images },
        PERSONAL_IMAGES,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
        loadingImage: false,
        index:
          this.state.images[imageCategory] == null
            ? 0
            : this.state.index == null
            ? this.state.images[imageCategory].length - 1
            : this.state.index,
      });
    });
  }

  tryDeleteImage() {
    createAlert(
      "Delete image?",
      "Are you sure you would like to remove this image from your personal profile?",
      [
        {
          text: "No",
          onPress: () => {
            resolveAlert();
          },
        },
        {
          text: "Yes",
          onPress: () => {
            this.deleteImage();
            resolveAlert();
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  }

  deleteImage() {
    this.setState({ loading: true }, async () => {
      if (this.state.index != null) {
        let images = this.state.images[this.state.imageCategory];
        images.splice(this.state.index, 1);

        await modifyPersonalDataForUser(
          { ...this.state.images, [this.state.imageCategory]: images },
          PERSONAL_IMAGES,
          this.props.activeAccount.accountHash
        );
      }

      this.props.navigation.dispatch(NavigationActions.back());
    });
  }

  closeTextInputModal() {
    this.setState({ currentTextInputModal: null }, () => {
      this.updateImage();
    });
  }

  render() {
    return PersonalImagesEditImageRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(PersonalImagesEditImage);