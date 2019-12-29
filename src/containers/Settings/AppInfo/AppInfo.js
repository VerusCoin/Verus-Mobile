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
import styles from './AppInfo.styles'

const DISCORD_URL = "https://discord.gg/VRKMP2S"
const REDDIT_URL = "https://www.reddit.com/r/VerusCoin/"
const TWITTER_URL = "https://twitter.com/VerusCoin"
const PRIVACY_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt"
const LICENCE_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE"
const LOGO_DIR = require('../../../images/customIcons/VerusLogo.png');

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
      <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
        <View style={styles.imageStyleContainer}>
          <Image
            style={styles.imageStyle}
            source={LOGO_DIR}
          />
          <Text style={styles.verifiedLabel}>Verus Mobile</Text>
        </View>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>App Version:</Text>
              <Text style={styles.infoText}>{global.APP_VERSION}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Platform:</Text>
              <Text style={styles.infoText}>{Platform.OS}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Platform Version:</Text>
              <Text style={styles.infoText}>{Platform.Version}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>VerusQR Version:</Text>
              <Text style={styles.infoText}>{global.VERUS_QR_VERSION}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Docs:</Text>
              <View style={styles.linkBox}>
              <TouchableOpacity onPress={() => this.openUrl(PRIVACY_URL)}>
                <Text style={styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.openUrl(LICENCE_URL)}>
                <Text style={styles.linkText}>Licence</Text>
              </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Contact:</Text>
              <View style={styles.linkBox}>
                <TouchableOpacity onPress={() => this.openUrl(DISCORD_URL)}>
                  <Text style={styles.linkText}>
                    Discord
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(REDDIT_URL)}>
                    <Text style={styles.linkText}>
                      Reddit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(TWITTER_URL)}>
                    <Text style={styles.linkText}>
                      Twitter
                    </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>     
      </ScrollView>
    )
  }
}

export default AppInfo;