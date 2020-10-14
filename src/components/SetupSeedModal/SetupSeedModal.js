/*
  This component creates a modal with options to 
  either import or create a user seed for account setup
*/

import React, { Component } from "react"
import {
  Modal,
  Text,
  ScrollView,
} from "react-native"
import Styles from '../../styles/index'
import StandardButton from "../StandardButton";
import CreateSeed from './CreateSeed/CreateSeed'
import ImportSeed from './ImportSeed/ImportSeed'

class SetupSeedModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      firstTimeSeed: true
    }
  }

  render() {
    const { cancel, setSeed, channel } = this.props
    const parentProps = {
      cancel,
      setSeed,
      channel
    }
    return (
      <Modal
        animationType={this.props.animationType}
        transparent={false}
        visible={this.props.visible}
        onRequestClose={cancel}
      >
        {this.state.firstTimeSeed ? (
          <CreateSeed {...parentProps} importSeed={() => this.setState({ firstTimeSeed: false })}/>
        ) : (
          <ImportSeed {...parentProps} createSeed={() => this.setState({ firstTimeSeed: true })}/>
        )}
      </Modal>
    );
  }
}

export default SetupSeedModal;