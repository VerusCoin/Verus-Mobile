import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import DatePickerModal from "../../../components/DatePickerModal/DatePickerModal";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../utils/constants/iso3166";
import { PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { renderPersonalBirthday, renderPersonalFullName } from "../../../utils/personal/displayUtils";

export const PersonalSelectDataRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>

      </ScrollView>
    </SafeAreaView>
  );
};
