/*
  This component displays the details of a manual bank transfer
*/

import React, { Component } from "react";
import { 
  View, 
  Text, 
  Linking, 
  TouchableOpacity,
  FlatList,
  SafeAreaView
} from "react-native";
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { Button, List, Divider } from "react-native-paper"
import SemiModal from "../SemiModal";
import { connect } from 'react-redux';
import { copyToClipboard } from "../../utils/clipboard/clipboard";

class BankTransferDetailsModal extends Component {
  constructor(props) {
    super(props);

    this.state = {}
  }

  openWebsite = (url) => {
    if (url != null) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          console.log("Don't know how to open URI: " + url);
        }
      });
    }
  };

  render() {
    const {
      transfer,
      cancel,
      visible,
      title,
      helpButton
    } = this.props;
    const { url, label } = helpButton
    const {
      bankAddress,
      bankPhone,
      routingNumber,
      accountNumber,
      beneficiary,
      beneficiaryAddress,
      intermediaryBank,
      swiftCode,
      abaNumber,
      city,
      branchCode,
      country,
      accountType,
      iban,
      amount
    } = transfer;

    return (
      <SemiModal
        animationType={"slide"}
        transparent={true}
        visible={visible}
        onRequestClose={() => {
          if (!this.state.loading) cancel();
        }}
        flexHeight={4}
      >
        <SafeAreaView style={Styles.centerContainer}>
          <View style={{ ...Styles.headerContainer, minHeight: 48, maxHeight: 48 }}>
            <View style={Styles.semiModalHeaderContainer}>
              <Button onPress={cancel} color={Colors.primaryColor}>
                {"Close"}
              </Button>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont,
                }}
              >
                {title}
              </Text>
              <Button onPress={() => this.openWebsite(url)} color={Colors.primaryColor}>
                {label}
              </Button>
            </View>
          </View>
          <FlatList
            style={Styles.fullWidth}
            renderItem={({ item }) => {
              if (item.data != null)
                return (
                  <React.Fragment>
                    <TouchableOpacity
                      disabled={item.onPress == null}
                      onPress={() => item.onPress()}
                    >
                      <List.Item
                        title={item.data}
                        description={item.key}
                        onPress={() => {
                          copyToClipboard(item.data, {
                            title: `${item.key} copied`,
                            message: `"${item.data}" copied to clipboard.`,
                          })
                        }}
                        titleNumberOfLines={100}
                        right={(props) =>
                          item.right ? (
                            <Text
                              {...props}
                              style={{
                                fontSize: 16,
                                alignSelf: "center",
                                marginRight: 8,
                              }}
                            >
                              {item.right}
                            </Text>
                          ) : null
                        }
                      />
                      <Divider />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              else return null;
            }}
            data={[
              {
                key: "Amount to send",
                data: amount,
              },
              {
                key: "IBAN",
                data: iban,
              },
              {
                key: "Beneficiary",
                data: beneficiary,
              },
              {
                key: "Bank account number",
                data: accountNumber,
              },
              {
                key: "Bank account type",
                data: accountType,
              },
              {
                key: "Beneficiary address",
                data: beneficiaryAddress,
              },
              {
                key: "Routing number",
                data: routingNumber,
              },
              {
                key: "Bank",
                data: intermediaryBank,
              },
              {
                key: "SWIFT code",
                data: swiftCode,
              },
              {
                key: "ABA number",
                data: abaNumber,
              },
              {
                key: "Branch code",
                data: branchCode,
              },
              {
                key: "Bank address",
                data: bankAddress,
              },
              {
                key: "City",
                data: city,
              },
              {
                key: "Country",
                data: country,
              },
              {
                key: "Bank phone",
                data: bankPhone,
              },
            ]}
          />
        </SafeAreaView>
      </SemiModal>
    );
  }
}

export default connect()(BankTransferDetailsModal);
