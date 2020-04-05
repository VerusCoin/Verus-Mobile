/*
  This component is simply to display the app version data and 
  mobile platform to the user. It is more for debugging or support purposes,
  and any general, non-sensitive, useful information that would help a dev
  help a user should go here.
*/

import React, { Component } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  Platform, 
  TouchableOpacity,
  Image,
  Linking
} from "react-native";
import Styles from '../../../styles/index'

const DISCORD_URL = "https://discord.gg/VRKMP2S"
const REDDIT_URL = "https://www.reddit.com/r/VerusCoin/"
const TWITTER_URL = "https://twitter.com/VerusCoin"
const PRIVACY_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt"
const LICENCE_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE"
const LOGO_DIR = require('../../../images/customIcons/Verus.png');

class AppInfo extends Component {

  openUrl = (url) => { 
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  }

  render() {
    return(
      <View style={Styles.defaultRoot}>
        <View style={Styles.centralRow}>
          <View style={Styles.fullWidthFlexCenterBlock}>
            <Image
              style={{
                width: 75,
                height: 75,
                resizeMode: "contain",
              }}
              source={LOGO_DIR}
            />
          </View>
        </View>
        <Text style={Styles.centralHeader}>Verus Mobile</Text>
        <ScrollView
          style={Styles.wide}
          contentContainerStyle={Styles.horizontalCenterContainer}
        >
          <View style={Styles.infoTable}>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>App Version:</Text>
              <Text style={Styles.infoTableCell}>{global.APP_VERSION}</Text>
            </View>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Platform:</Text>
              <Text style={Styles.infoTableCell}>{Platform.OS}</Text>
            </View>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Platform Version:</Text>
              <Text style={Styles.infoTableCell}>{Platform.Version}</Text>
            </View>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>VerusQR Version:</Text>
              <Text style={Styles.infoTableCell}>{global.VERUS_QR_VERSION}</Text>
            </View>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Docs:</Text>
              <View style={Styles.infoTableCell}>
              <TouchableOpacity onPress={() => this.openUrl(PRIVACY_URL)}>
                <Text style={Styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.openUrl(LICENCE_URL)}>
                <Text style={Styles.linkText}>Licence</Text>
              </TouchableOpacity>
              </View>
            </View>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Contact:</Text>
              <View style={Styles.infoTableCell}>
                <TouchableOpacity onPress={() => this.openUrl(DISCORD_URL)}>
                  <Text style={Styles.linkText}>
                    Discord
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(REDDIT_URL)}>
                    <Text style={Styles.linkText}>
                      Reddit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(TWITTER_URL)}>
                    <Text style={Styles.linkText}>
                      Twitter
                    </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>     
      </ScrollView>
      </View>
    )
  }
}

export default AppInfo;