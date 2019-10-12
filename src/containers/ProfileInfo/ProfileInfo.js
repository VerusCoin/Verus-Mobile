/*
  This component is meant to display information about a 
  user that could help with debugging. 
*/

import React, { Component } from "react";
import { 
  View, 
  Text, 
} from "react-native";
import { Icon } from "react-native-elements"
import { connect } from 'react-redux';
import styles from './ProfileInfo.styles'

class ProfileInfo extends Component {
  render() {
    return(
      <View style={styles.root}>
        <View style={{width: "100%", height: "100%"}}>
          <Icon style={styles.Icon} size={50} color="#E9F1F7" name={"account-circle"} />
          <Text style={styles.profileLabel}>Profile Details</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>Name:</Text>
                <Text style={styles.infoText}>{this.props.activeAccount.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>Active Coins:</Text>
                <Text style={styles.infoText}>{this.props.activeCoinsForUser.length}</Text>
              </View>
            </View>  
          </View>   
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser
  }
};

export default connect(mapStateToProps)(ProfileInfo);