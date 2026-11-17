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
import { openUrl } from "../../utils/linking";

class BankTransferDetailsModal extends Component {
  constructor(props) {
    super(props);

    this.state = {}
  }

  openWebsite = (url) => {
    openUrl(url);
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
      amount,
      currency
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
              <Button onPress={cancel} textColor={Colors.primaryColor}>
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
              <Button onPress={() => this.openWebsite(url)} textColor={Colors.primaryColor}>
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
                      {item.header != null && (
                        <React.Fragment>
                          <List.Subheader>{item.header}</List.Subheader>
                          <Divider />
                        </React.Fragment>
                      )}
                      <List.Item
                        title={item.data}
                        description={item.key}
                        onPress={() => {
                          copyToClipboard(item.data, {
                            title: `${item.key} copied`,
                            message: `"${item.data}" copied to clipboard.`,
                          });
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
                key: "Exact amount to send",
                data: `${amount} ${currency}`,
              },
              {
                key: "IBAN",
                data: iban,
              },
              {
                key: "Bank + Bank Address",
                data: bankAddress,
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
                key: "ABA number",
                data: abaNumber,
              },
              {
                key: "Branch code",
                data: branchCode,
              },
              {
                key: "SWIFT code",
                data: swiftCode,
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
              {
                key: "Intermediary bank (for international wires only)",
                data: intermediaryBank,
                header: "In case of international wire only:"
              },
            ]}
          />
        </SafeAreaView>
      </SemiModal>
    );
  }
}

export default connect()(BankTransferDetailsModal);
