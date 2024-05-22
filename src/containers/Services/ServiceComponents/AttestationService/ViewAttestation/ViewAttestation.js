import React, { Component } from "react"
import { connect } from 'react-redux'

import { primitives } from "verusid-ts-client"

import * as VDXF_Data from "verus-typescript-primitives/dist/vdxf/vdxfDataKeys";

const { ATTESTATION_NAME } = primitives;
import { IdentityVdxfidMap } from "verus-typescript-primitives/dist/vdxf/classes/IdentityData";
import { SafeAreaView, ScrollView, View, Image } from 'react-native'

import { Divider, List, Button, Text } from 'react-native-paper';
import Styles from "../../../../../styles";
import Colors from '../../../../../globals/colors';

class ViewAttestation extends Component {
    constructor(props) {
        super(props);
        this.state = {
            attestationData: {},
            signer: ""
        };
    }

    componentDidMount() {
        this.updateDisplay();
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
        const { attestation } = this.props.route.params

        const signatureData = attestation.data.find((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.SignatureDataKey().vdxfid)[VDXF_Data.SignatureDataKey().vdxfid];
        const mmrData = attestation.data.find((dataDescriptor) => Object.keys(dataDescriptor)[0] === VDXF_Data.MMRDescriptorKey().vdxfid)[VDXF_Data.MMRDescriptorKey().vdxfid];

        const containingData = this.getAttestationData(mmrData.datadescriptors);
        this.setState({ attestationData: containingData, signer:attestation.signer });

    }

    render() {
        return (
            <SafeAreaView style={Styles.defaultRoot}>
                <ScrollView
                    style={Styles.fullWidth}
                    contentContainerStyle={Styles.focalCenter}>
                    <View style={Styles.fullWidth}>

                        <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom: 20 }}>
                            {`From: `}<Text style={{ fontSize: 20, color: Colors.primaryColor, fontWeight: 'bold', marginVertical: 5, }}>{`${this.state.signer}`}</Text>
                        </Text>
                        {this.state.attestationData && Object.keys(this.state.attestationData).map(request => {
                            return (
                                <React.Fragment key={request}>
                                    <List.Item
                                        title={request}
                                        description={this.state.attestationData[request]?.message}
                                        key={request}
                                        right={() => this.state.attestationData[request]?.image ? <List.Icon icon={{ uri: this.state.attestationData[request]?.image }} /> : null}
                                    />
                                    <Divider />
                                </React.Fragment>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>)
    }
}

const mapStateToProps = (state) => {
    return {
        activeAccount: state.authentication.activeAccount,
        encryptedPersonalData: state.personal
    }
};

export default connect(mapStateToProps)(ViewAttestation);