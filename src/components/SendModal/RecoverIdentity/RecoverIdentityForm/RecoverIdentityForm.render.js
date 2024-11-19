import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button, Paragraph, Checkbox } from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD, SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD, SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD, SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD, SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS, SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY } from "../../../../utils/constants/sendModal";
import Colors from "../../../../globals/colors";
import BarcodeReader from "../../../BarcodeReader/BarcodeReader";

export const RecoverIdentityFormRender = ({
  submitData, 
  updateSendFormData, 
  sendModalData, 
  networkName, 
  scannerOpen, 
  toggleScanner, 
  handleScan, 
  toggleEditRevocationRecovery,
  toggleEditZAddr
}) => {
  return scannerOpen ? (
    <View style={Styles.blackRoot}>
      <BarcodeReader
        prompt="Scan an address"
        onScan={(codes) => handleScan(codes)}
        button={() => (
          <Button
            mode="contained"
            buttonColor={Colors.warningButtonColor}
            onPress={toggleScanner}
            style={{
              marginBottom: 48
            }}
          >
            {"Cancel"}
          </Button>
        )}
      />
    </View>
  ) : 
  (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          ...Styles.flexBackground,
          ...Styles.fullWidth,
        }}
        contentContainerStyle={{
          ...Styles.centerContainer,
          justifyContent: "flex-start",
        }}
      >
        <View style={{ ...Styles.wideBlock, paddingBottom: 0 }}>
          <TextInput
            returnKeyType="done"
            label="i-Address or VerusID handle to recover"
            value={sendModalData[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]}
            mode="outlined"
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
            dense
          />
          <Paragraph style={{ color: Colors.quaternaryColor, paddingLeft: 16 }}>
            {`${networkName} blockchain`}
          </Paragraph>
        </View>
        <View style={{...Styles.wideBlock, paddingTop: 0, ...Styles.flexRow}}>
          <TextInput
            returnKeyType="done"
            label="New primary address"
            value={sendModalData[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]}
            mode="outlined"
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
            dense
            style={{
              flex: 1,
            }}
          />
          <Button
            textColor={Colors.primaryColor}
            style={{
              alignSelf: 'center',
              marginTop: 6,
            }}
            onPress={() => toggleScanner(SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD)}
            compact>
            {'Scan QR'}
          </Button>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Checkbox.Item
            color={Colors.primaryColor}
            label={'Change revocation/recovery identities'}
            status={sendModalData[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] ? 'checked' : 'unchecked'}
            onPress={() => toggleEditRevocationRecovery()}
            mode="android"
            style={{
              width: '100%',
            }}
          />
          {sendModalData[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] && 
            (<>
              <TextInput
                returnKeyType="done"
                label="New recovery VerusID"
                value={sendModalData[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD]}
                mode="outlined"
                onChangeText={(text) =>
                  updateSendFormData(SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD, text)
                }
                autoCapitalize={"none"}
                autoCorrect={false}
                dense
                style={{
                  width: '100%',
                }}
              />
              <TextInput
                returnKeyType="done"
                label="New revocation VerusID"
                value={sendModalData[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD]}
                mode="outlined"
                onChangeText={(text) =>
                  updateSendFormData(SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD, text)
                }
                autoCapitalize={"none"}
                autoCorrect={false}
                dense
                style={{
                  width: '100%',
                }}
              />
          </>)
        }
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Checkbox.Item
            color={Colors.primaryColor}
            label={'Change private address'}
            status={sendModalData[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] ? 'checked' : 'unchecked'}
            onPress={() => toggleEditZAddr()}
            mode="android"
            style={{
              width: '100%',
            }}
          />
          {sendModalData[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] && 
            (<View style={Styles.flexRow}>
              <TextInput
                returnKeyType="done"
                label="New private z-address"
                value={sendModalData[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD]}
                mode="outlined"
                onChangeText={(text) =>
                  updateSendFormData(SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD, text)
                }
                autoCapitalize={"none"}
                autoCorrect={false}
                dense
                style={{
                  flex: 1
                }}
              />
              <Button
                textColor={Colors.primaryColor}
                style={{
                  alignSelf: 'center',
                  marginTop: 6,
                }}
                onPress={() => toggleScanner(SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD)}
                compact>
                {'Scan QR'}
              </Button>
            </View>)
          }
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={submitData}>
            Recover
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};