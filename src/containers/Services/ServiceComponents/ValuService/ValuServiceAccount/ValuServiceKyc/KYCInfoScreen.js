import React, { Component } from 'react';
import { connect } from 'react-redux';
import ValuProvider from "../../../../../../utils/services/ValuProvider";
import { resetAccount } from '../../../../../../actions/actions/services/dispatchers/valu/updates';
import { expireServiceData, setValuAccount } from "../../../../../../actions/actionCreators";
import { API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS, VALU_SERVICE } from "../../../../../../utils/constants/intervalConstants";
import { updateKYCStage } from '../../../../../../actions/actions/services/dispatchers/valu/updates';
import { setValuAccountStage } from "../../../../../../actions/actionCreators";
import {
  View,
  Text,
  Alert,
  ScrollView,
} from 'react-native';

import {
  Badge,
  Button
} from 'react-native-elements';

import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';
import {topProgress} from "./ValuBadgeProgress"
import { valuFields} from "./KYCSchema"
import {
  PERSONAL_ATTESTATIONS,
} from "../../../../../../utils/constants/personal";
import { modifyPersonalDataForUser } from "../../../../../../actions/actionDispatchers";

const timeToComplete = {
  "0": "Completed",
  "1": "1 min",
  "2": "2 min",
  "3": "Submitted",
  "4": "Pending",
  "5": "Not Submitted"
}

const buttonText = {
  "0": "START",
  "1": "CONTINUE",
  "2": "BACK",
  "3": "CLAIM ATTESTATION"
}

const stages = [
  {number: 1, buttonText:buttonText[0], completearray: [timeToComplete[0], timeToComplete[1], timeToComplete[2], timeToComplete[2], timeToComplete[2]], navigateTo: "KYCIdentityInput" },
  {number: 1, buttonText:buttonText[0], completearray: [timeToComplete[0], timeToComplete[1], timeToComplete[2], timeToComplete[2], timeToComplete[2]], navigateTo: "KYCIdentityInput" },
  {number: 1, buttonText:buttonText[1], completearray: [timeToComplete[0], timeToComplete[3], timeToComplete[2], timeToComplete[2], timeToComplete[2]], navigateTo: "KYCDocumentType" },
  {number: 3, buttonText:buttonText[1], completearray: [timeToComplete[0], timeToComplete[3], timeToComplete[3], timeToComplete[2], timeToComplete[2]], navigateTo: "KYCPayForService" },
  {number: 4, buttonText:buttonText[3], completearray: [timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[2]], navigateTo: "GetAttestation" },
  {number: 4, buttonText:buttonText[1], completearray: [timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[2]], navigateTo: "FundValuAccount" },
  {number: 4, buttonText:buttonText[1], completearray: [timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[2]], navigateTo: "FundValuAccount" },
  {number: 4, buttonText:buttonText[1], completearray: [timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0]], navigateTo: "FundValuAccount" },
  {number: 5, buttonText:buttonText[2], completearray: [timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0], timeToComplete[0]], navigateTo: "Services" }
]

class KYCInfoScreen extends Component {
constructor(props) {
    super(props)
    this.state = {
      numberOn: null,
      completedTime: [],
      buttonText: null,
      nextFormNavigate: null,
      loading: false,
      reset: 3
    }
  }

  onClick = async () => {   
    if(this.props.KYCState) {
      
      if (this.props.KYCState == 8) {
        await this.onClickResetAccount(9)
      }
      this.props.navigation.navigate(stages[this.props.KYCState].navigateTo);
    
    } 
  }

  claimAttestation = async () => {

    let contacts = await ValuProvider.getAccount(this.props.accountId); 
    let addresses = await ValuProvider.getAddresses();

    let address = addresses.filter((address) => address.id == contacts.data.data[0].relationships["primary-address"].data.id)[0].attributes

    if (contacts.data.data[0].attributes["aml-cleared"] == true && contacts.data.data[0].attributes["cip-cleared"] == true  &&
    contacts.data.data[0].attributes["proof-of-address-documents-verified"] == true  && contacts.data.data[0].attributes["identity-confirmed"] == true)
    {
      console.log("wantedAddress: ", address)

      let filteredContact = {}
      for (const item in contacts.data.data[0].attributes)
      {
        if(valuFields.indexOf(item) > -1)
          filteredContact[item] = contacts.data.data[0].attributes[item];

      }
      console.log("filtered contact", filteredContact)

     const attestation = await ValuProvider.getAttestation({...filteredContact, ...address});
     this.updateAttestations(attestation.data);

     console.log("your Attestsion", attestation.data)
    }
    
  }

  //TODO: REMOVE DEBUG only
  async onClickResetAccount(value) {

    //await resetAccount();
   // this.props.dispatch(setValuAccount({acountId: null, KYCState: 0}));
    await updateKYCStage(value);
    this.props.dispatch(setValuAccountStage(value));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT))


  }

  updateAttestations(attestation) {
    this.setState({ loading: true }, async () => {
     
      await modifyPersonalDataForUser(
        attestation,
        PERSONAL_ATTESTATIONS,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
      });
    });
  }

  render() {
    
    if(this.props.KYCState == null) return null;
    
    const currentStage = stages[this.props.KYCState] ;

    return (
      <ScrollView style={Styles.root}>
        {topProgress(currentStage.number)}
        <View>
          <View style={Styles.padding}>
            <Text style={Styles.boldTextPlain}>To use our fiat gateway, VALU OnRamp has to verify your identity</Text>
          </View>

          <View >
            <Text style={{ ...Styles.padding, textAlign: 'left', marginBottom: 1 }}>All documents are handled securely and with care. VALU OnRamp Privacy Policy, Terms of Service</Text>
          </View>

        </View>
        <View>
          <View style={Styles.alignItemsRight}>
          <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
            <Badge value={1} status="success" containerStyle={Styles.horizontalPaddingBox5 } badgeStyle={{ backgroundColor:Colors.primaryColor }}/>
              <Text style={{fontWeight: 'bold', width: '60%', color: Colors.quaternaryColor}}>Create your account</Text>
              <Text style={Styles.infoText}>{currentStage.completearray[0]}</Text>
           </View>
           <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
             <Badge value={2} status="primary" containerStyle={Styles.horizontalPaddingBox5} badgeStyle={{ backgroundColor:Colors.primaryColor }} />
              <View style={{...Styles.alignItemsRight, width: '60%'}}>
                <Text style={{fontWeight: 'bold',color: Colors.quaternaryColor}}>My personal information</Text>
                  <Text>name, date of birth, address</Text>
              </View>
             <Text style={Styles.infoText}>{currentStage.completearray[1]}</Text>
            </View>
            <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
              <Badge value={3} status="primary" containerStyle={Styles.horizontalPaddingBox5} badgeStyle={{ backgroundColor:Colors.primaryColor }} />
                <View style={{...Styles.alignItemsRight, width: '60%'}} badgeStyle={{ backgroundColor:Colors.primaryColor }}>
                  <Text style={{fontWeight: 'bold', width: '80%', color: Colors.quaternaryColor}} >Verify Photo ID & Address</Text>
                   <Text >Scan or upload document</Text>
                </View>
                <Text style={Styles.infoText}>{currentStage.completearray[2]}</Text>
             </View>
             <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
               <Badge value={4} status="primary" containerStyle={Styles.horizontalPaddingBox5} badgeStyle={{ backgroundColor:Colors.primaryColor }} />
                 <View style={{...Styles.alignItemsRight, width: '60%'}}>
                   <Text style={{fontWeight: 'bold', width: '60%', color: Colors.quaternaryColor}}>Purchase Attestation</Text>
                   <Text>Recieve your KYC Attesation to your Identity</Text>
                 </View>
                 <Text style={{ ...Styles.infoText  }}>{currentStage.completearray[3]}</Text>
              </View>
              <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
               <Badge value={5} status="primary" containerStyle={Styles.horizontalPaddingBox5} badgeStyle={{ backgroundColor:Colors.primaryColor }} />
                 <View style={{...Styles.alignItemsRight, width: '60%'}}>
                   <Text style={{fontWeight: 'bold', width: '60%', color: Colors.quaternaryColor}}>Connect Bank</Text>
                   <Text>Enable fiat to crypto conversions.</Text>
                 </View>
                 <Text style={{ ...Styles.infoText  }}>{currentStage.completearray[4]}</Text>
              </View>
            </View>
      {this.props.KYCState == 4 && (
        <View>
          <Text style={{...Styles.infoText, textAlign: 'center', marginTop: 15 }}>{"SUCCESS"}</Text>
          <Text style={{ ...Styles.padding, textAlign: 'left', marginBottom: 1 }}>Your Documents have successfully been submitted, once confirmed your Attestation will be sent to you.</Text>
        </View>
      )}      
      </View>
        <View style={Styles.padding}>
          {this.props.KYCState == 8 && (
          <View>
            <Text style={{...Styles.infoText, textAlign: 'center', marginTop: 15 }}>{"COMPLETED"}</Text>
            <Text style={{ ...Styles.padding, textAlign: 'left' }}>You have completed the VALU sign in, please go back to the main wallet to enjoy all the features in the VALUVERSE</Text>
          </View>
        )}
          <Button
          title={currentStage.buttonText}
          titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
          buttonStyle={{...Styles.fullWidthButton, backgroundColor:Colors.primaryColor, marginTop: 20, paddingTop: 20, paddingBottom: 20, borderRadius: 20} }
          onPress={ this.onClick }
          />
        </View>
        {this.props.KYCState == 500 && (
        <View style={Styles.padding}>
          <Button
          title={"CLAIM ATTESTATION"}
          titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
          buttonStyle={{...Styles.fullWidthButton, backgroundColor:Colors.primaryColor, marginTop: 1, paddingTop: 1, paddingBottom: 1, borderRadius: 20} }
          onPress={ this.claimAttestation }
          />
        </View>
      )} 
      {this.props.KYCState == 5 && ( <View style={Styles.padding}>
        <Button
        title={"RESET ACCOUNT TO STAGE " + this.state?.reset}
        titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
        buttonStyle={{...Styles.fullWidthButton, backgroundColor:Colors.primaryColor, marginTop: 1, paddingTop: 1, paddingBottom: 1, borderRadius: 20} }
        onPress={ this.onClickResetAccount }
        />
        </View> )}
      </ ScrollView>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
  activeAccount: state.authentication.activeAccount,
  KYCState: state.channelStore_valu_service.KYCState || 0,
  email: state.channelStore_valu_service.email,
  accountId: state.channelStore_valu_service.accountId
}
};


export default connect(mapStateToProps)(KYCInfoScreen);
