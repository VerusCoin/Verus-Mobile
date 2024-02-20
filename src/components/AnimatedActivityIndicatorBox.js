import React, { Component } from "react";
import { View } from 'react-native'
import styles from "../styles";
import AnimatedActivityIndicator from "./AnimatedActivityIndicator";
import { connect } from "react-redux";
import Colors from "../globals/colors";

class AnimatedActivityIndicatorBox extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <View style={[styles.focalCenter,{backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor}]}>
        <AnimatedActivityIndicator
          style={{
            width: 128,
          }}
        />
      </View>
    );
  }
}

const mapStateToProps = (state)=>{
  return{
    darkMode:state.settings.darkModeState
  }
}

export default connect(mapStateToProps)(AnimatedActivityIndicatorBox);
