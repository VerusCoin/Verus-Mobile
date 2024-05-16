import { Component } from "react"
import { connect } from 'react-redux'
import { createAlert, resolveAlert } from "../../../actions/actions/alert/dispatchers/alert"
import { LoginReceiveAttestationRender } from "./LoginReceiveAttestation.render"
import { primitives } from "verusid-ts-client"
import { VDXFDataToUniValueArray } from "verus-typescript-primitives/dist/vdxf/classes/DataDescriptor.js";
import * as VDXF_Data from "verus-typescript-primitives/dist/vdxf/vdxfDataKeys";
import { SignatureData } from "verus-typescript-primitives/dist/vdxf/classes/SignatureData";
import { verifyHash } from "../../../utils/api/channels/vrpc/requests/verifyHash";
import { getSignatureInfo } from "../../../utils/api/channels/vrpc/requests/getSignatureInfo";
const { ATTESTATION_NAME } = primitives;
import { IdentityVdxfidMap } from "verus-typescript-primitives/dist/vdxf/classes/IdentityData";
import { ATTESTATIONS_PROVISIONED } from "../../../utils/constants/attestations";
import { modifyAttestationDataForUser } from "../../../actions/actions/attestations/dispatchers/attestations";

class LoginReceiveAttestation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loginConsent: null,
      loading: false,
      ready: false,
      personalDataURL: "",
      signerFqn: this.props.route.params.signerFqn,
      attestationName: "",
      attestationData: {},
      completeAttestaton: {},
    };
    const dfg = 2111111
  }

  componentDidMount() {
    this.updateDisplay();
  }

  cancel = () => {
    if (this.props.route.params.cancel) {
      this.props.route.params.cancel.cancel()
    }
  }

  validateAttestation = async (signatureData) => {

    const sigObject = SignatureData.fromJson(signatureData);

    const sigInfo = await getSignatureInfo(
      sigObject.systemID,
      sigObject.identityID,
      sigObject.signatureAsVch.toString('base64'),
    );

    return await verifyHash(sigObject.systemID, sigObject.identityID, sigObject.signatureAsVch.toString('base64'), sigObject.getIdentityHash(sigInfo));

  }

  getAttestationData = (dataDescriptors) => {

    const data = {};
    dataDescriptors.forEach((dataDescriptor) => {
      const label = dataDescriptor.objectdata[Object.keys(dataDescriptor.objectdata)[0]].label;
      let key = "";

      if (label === ATTESTATION_NAME.vdxfid) {
        key = `Attestation name`
      } else {
        key = IdentityVdxfidMap[label]?.name || label;
      }

      const mime = dataDescriptor.objectdata[Object.keys(dataDescriptor.objectdata)[0]].mimetype || "";
      if (mime.startsWith("text/")) {
        data[key] = { "message": dataDescriptor.objectdata[Object.keys(dataDescriptor.objectdata)[0]].objectdata.message };
      } else if (mime.startsWith("image/")) {
        if (mime === "image/jpeg" || mime === "image/png") {
          data[key] = { "image": `data:${mime};base64,${Buffer.from(dataDescriptor.objectdata[Object.keys(dataDescriptor.objectdata)[0]].objectdata, "hex").toString("base64")}` };
        }
      }
    });

    return data;

  }

  updateDisplay() {
    const { deeplinkData } = this.props.route.params
    const loginConsent = new primitives.LoginConsentRequest(deeplinkData);

    if (loginConsent.challenge.attestations && loginConsent.challenge.attestations.length > 1) {
      createAlert("Error", "Only one attestation is allowed to be received at a time.");
      this.cancel();
      return;
    }

    const checkAttestation = loginConsent.challenge.attestations[0];

    if (checkAttestation.vdxfkey === primitives.ATTESTATION_PROVISION_OBJECT.vdxfid) {

      const dataDescriptorObject = VDXFDataToUniValueArray(Buffer.from(checkAttestation.data, "hex"));

      if (!Array.isArray(dataDescriptorObject)) {
        createAlert("Error", "Invalid data descriptor object in Attestation.");
        this.cancel();
        return;
      }

      if (dataDescriptorObject.some((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.DataURLKey().vdxfid)) {

        // TODO: Handle fetch data from URL
      }
      else if (dataDescriptorObject.some((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.MMRDescriptorKey().vdxfid) &&
        dataDescriptorObject.some((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.SignatureDataKey().vdxfid)) {

        const signatureData = dataDescriptorObject.find((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.SignatureDataKey().vdxfid)[VDXF_Data.SignatureDataKey().vdxfid];
        const mmrData = dataDescriptorObject.find((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.MMRDescriptorKey().vdxfid)[VDXF_Data.MMRDescriptorKey().vdxfid];

        if (!this.validateAttestation(signatureData) || mmrData.mmrroot.objectdata != signatureData.signaturehash) {
          createAlert("Error", "Invalid attestation signature.");
          this.cancel();
          return;
        }

        const attestationName = mmrData.datadescriptors.find((dataDescriptor) => dataDescriptor.objectdata[Object.keys(dataDescriptor.objectdata)[0]].label === ATTESTATION_NAME.vdxfid)?.objectdata;

        if (!attestationName || Object.values(attestationName)[0].label !== ATTESTATION_NAME.vdxfid) {
          createAlert("Error", "Attestation has no name.");
          this.cancel();
          return;
        } else {

          this.setState({ attestationName: Object.values(attestationName)[0].objectdata.message });

        }

        const containingData = this.getAttestationData(mmrData.datadescriptors);
        this.setState({ attestationData: containingData, completeAttestaton: {[loginConsent.getChallengeHash(1).toString('base64')]: dataDescriptorObject} });

      } else {
        createAlert("Error", "Invalid attestation type.");
        this.cancel();
        return;
      }

    }
  }

  handleContinue() {
    this.setState(
      { loading: true },
      async () => {
      //  console.log(JSON.stringify(this.state.completeAttestaton, null, 2))
        await modifyAttestationDataForUser(
          this.state.completeAttestaton,
          ATTESTATIONS_PROVISIONED,
          this.props.activeAccount.accountHash
        );

        this.setState({ loading: false });
        this.props.route.params.onGoBack(true);
        this.props.navigation.goBack();
        this.cancel();
      }
    );
  };


  render() {
    return LoginReceiveAttestationRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedPersonalData: state.personal
  }
};

export default connect(mapStateToProps)(LoginReceiveAttestation);