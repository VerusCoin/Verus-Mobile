import moment from "moment";
import { Component } from "react"
import { connect } from 'react-redux'
import { createAlert, resolveAlert } from "../../../actions/actions/alert/dispatchers/alert"
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES, PERSONAL_CONTACT, PERSONAL_LOCATIONS, PERSONAL_PAYMENT_METHODS, PERSONAL_IMAGES } from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { LoginShareAttestationRender } from "./LoginShareAttestation.render"
import { checkPersonalDataCatagories } from "../../../utils/personal/displayUtils";
import { handleAttestationDataSend } from "../../../utils/deeplink/handlePersonalDataSend";
import { primitives } from "verusid-ts-client"
import { ATTESTATIONS_PROVISIONED } from "../../../utils/constants/attestations";
import { requestAttestationData } from "../../../utils/auth/authBox";
import { IdentityVdxfidMap } from 'verus-typescript-primitives/dist/vdxf/classes/IdentityData';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { createAttestationResponse } from "../../../utils/attestations/createAttestationResponse";

const { IDENTITYDATA_CONTACT, IDENTITYDATA_PERSONAL_DETAILS, IDENTITYDATA_LOCATIONS, IDENTITYDATA_DOCUMENTS_AND_IMAGES, IDENTITYDATA_BANKING_INFORMATION } = primitives;
import * as VDXF_Data from "verus-typescript-primitives/dist/vdxf/vdxfDataKeys";
import { DrawerContentScrollView } from "@react-navigation/drawer";

class LoginShareAttestation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attestationName: "",
      attestationAcceptedAttestors: [],
      attestationRequestedFields: [],
      attestationRequestedVdxfKeys:[],
      attestationID: "",
      loading: false,
      ready: false,
      attestationDataURL: "",
      signerFqn: this.props.route.params.signerFqn
    };
    const sdf = 234111
  }

  componentDidMount() {
    this.updateDisplay();
  }

  cancel = () => {
    if (this.props.route.params.cancel) {
      this.props.route.params.cancel.cancel()
    }
  }

  createAttestationReply = async () => {

    const reply = await createAttestationResponse(this.state.attestationID, this.state.attestationRequestedVdxfKeys)
    return reply;
  }


  updateDisplay = async () => {
    const { deeplinkData } = this.props.route.params
    const loginConsent = new primitives.LoginConsentRequest(deeplinkData);

    const subjectKeys = {};
    let attestationName = "";
    let attestationAcceptedAttestors = [];
    let attestationID = "";

    const attestationDataURL = loginConsent.challenge.subject
      .filter((permission) => permission.vdxfkey === primitives.LOGIN_CONSENT_PERSONALINFO_WEBHOOK_VDXF_KEY.vdxfid);

    for (let i = 0; i < loginConsent.challenge.subject.length; i++) {

      let permission = loginConsent.challenge.subject[i];

      if (permission.vdxfkey == primitives.ATTESTATION_VIEW_REQUEST_NAME.vdxfid) {
        attestationName = permission.data;
      } else if (permission.vdxfkey == primitives.ATTESTATION_VIEW_REQUEST_ATTESTOR.vdxfid) {
        let attestorFqn;

        try {
          const reply = await getIdentity(loginConsent.system_id, permission.data);
          attestorFqn = reply.result.friendlyname;
        } catch (e) {
          console.log("Error getting attestation signer ", e);
          return false;
        }
        attestationAcceptedAttestors.push(attestorFqn);

      }
      else {
        subjectKeys[permission.data] = true;
      }
    };

    let attestationData;
    try {
      attestationData = await requestAttestationData(ATTESTATIONS_PROVISIONED);
    } catch (e) {
      createAlert('Error Loading Attestations', e.message);
    }

    // check that the requested attestestation name is in the attestationData

    let attestationRequestedFields = [];
    const attestationDataKeys = Object.keys(attestationData);
    const attestationDataValues = Object.values(attestationData);
    let attestationRequestedVdxfKeys = loginConsent.challenge.subject
      .map((permission) => permission.data);

    for (let i = 0; i < attestationDataKeys.length; i++) {

      for (let j = 0; j < attestationDataValues[i].data.length; j++) {

        const vdxfobjKey = Object.keys(attestationDataValues[i].data[j])[0];
        const vdxfobjValue = attestationDataValues[i].data[j][vdxfobjKey];

        if (vdxfobjKey === VDXF_Data.MMRDescriptorKey().vdxfid) {
          
          for (let k = 0; k < vdxfobjValue.datadescriptors.length; k++) {

            const item = vdxfobjValue.datadescriptors[k].objectdata[VDXF_Data.DataDescriptorKey().vdxfid];

            if (item.label === primitives.ATTESTATION_NAME.vdxfid) {
              if (item.objectdata.message !== attestationName) {
                continue;
              }
            } else if (item.label === primitives.ATTESTATION_VIEW_REQUEST_ATTESTOR.vdxfid) {
              if (attestationAcceptedAttestors.indexOf(item.objectdata.message) === -1) {
                continue;
              } 
            } else if (subjectKeys[item.label]) {
              let name;
       
              if (name = IdentityVdxfidMap[item.label]?.name) {
                attestationRequestedFields.push(name);
              } else {
                attestationRequestedFields.push(item.label);
              }
            }
          }
          if (attestationRequestedFields && attestationAcceptedAttestors) {
               attestationID = attestationDataKeys[0];
          }
        }
      }
    }
    this.setState({ attestationRequestedFields, 
      attestationAcceptedAttestors, 
      attestationName, 
      attestationID, 
      attestationDataURL: { vdxfkey: attestationDataURL[0].vdxfkey, uri: attestationDataURL[0].data },
      attestationRequestedVdxfKeys });
  }

  async handleContinue() {
    this.setState({ loading: true });

    const createdAttestation = await this.createAttestationReply()

    createAlert(
      "Send Selected Attestation info",
      "Are you sure you want to send your attestation data to: \n" + `${this.state.signerFqn}`,
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
            resolveAlert();
            handleAttestationDataSend(createdAttestation, this.state.attestationDataURL)
              .then(() => {
                this.setState({ loading: false });
                this.props.route.params.onGoBack(true);
                this.props.navigation.goBack();
                this.cancel();
              }).catch((e) => {

                this.setState({ loading: false });
                createAlert("Error, Failed to Send Attestation, server may be unavailable.", e.message);

              })
          },
        },
      ],
      {
        cancelable: false,
      }
    );


  };

  render() {
    return LoginShareAttestationRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedPersonalData: state.personal
  }
};

export default connect(mapStateToProps)(LoginShareAttestation);