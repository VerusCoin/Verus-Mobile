import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Portal, Button, Text } from "react-native-paper";
import DatePickerModal from "../../../components/DatePickerModal/DatePickerModal";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../utils/constants/iso3166";
import { PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { renderPersonalBirthday, renderPersonalFullName } from "../../../utils/personal/displayUtils";
import Colors from '../../../globals/colors';

export const PersonalSelectDataRender = function () {
  const permissions = [1, 2, 3, 4]
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <View style={Styles.fullWidth}>

          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom:20 }}>
            Agree to share the following personal data.
          </Text>
          {this.state.catagoriesRequested && Object.values(this.state.catagoriesRequested).map((request, index) => {
            return (
              <React.Fragment key={index}>
                <List.Item
                  title={request.title}
                  description={request.details}
                  onPress={this.state.loading ? () => { } : () => this.openAttributes(request.navigateTo)}
                  right={(props) => <List.Icon {...props} icon={"select-group"} size={20} />}
                />
                <Divider />
              </React.Fragment>

            );
          })}
          {this.state.otherKeysRequested && Object.values(this.state.otherKeysRequested).map((request, index) => {
            return (
              <React.Fragment key={index}>
                <List.Item
                  title={request}
                  description={"Personal information"}
                  onPress={() => { }}
                  right={(props) => <List.Icon {...props} icon={"file-check"} size={20} />}
                />
                <Divider />
              </React.Fragment>

            );
          })}

        </View>
      </ScrollView>
        <View
          style={{
            ...Styles.fullWidthBlock,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            display: 'flex',
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={this.ready ? Colors.verusGreenColor : Colors.lightGrey}
            style={{ width: 148 }}
            onPress={() => this.handleContinue()}>
            Accept
          </Button>
        </View>
    </SafeAreaView>
  );
};
