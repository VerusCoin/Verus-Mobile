/*
  This component creates a modal with options to 
  either import or create a user seed for account setup
*/

import React, { Component } from "react"
import { View } from "react-native"
import CreateSeed from './CreateSeed/CreateSeed'
import ImportSeed from './ImportSeed/ImportSeed'
import Modal from '../Modal'
import { getKey } from "../../utils/keyGenerator/keyGenerator";
import { DEFAULT_SEED_PHRASE_LENGTH } from '../../utils/constants/constants'
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import AnimatedActivityIndicator from "../AnimatedActivityIndicator";
import styles from "../../styles";

class SetupSeedModal extends Component {
  constructor(props) {
    super(props);    
    this.state = {
      firstTimeSeed: true,
      createSeedState: {
        newSeed: null,
        newSeedWords: null,
        formStep: 0,
        randomIndices: [0, 0, 0],
        wordGuesses: [null, null, null],
        guessErrors: [false, false, false]
      },
      importSeedState: {
        seed: '',
        scanning: false,
        showSeed: false
      },
      loadingSeed: true
    }
  }

  async componentDidMount() {
    try {
      const newSeed = await getKey(256);

      this.setState({
        loading: false,
        createSeedState: {
          ...this.state.createSeedState,
          newSeed,
          newSeedWords: newSeed.split(" "),
        }
      })
    } catch(e) {
      createAlert("Error", "Error generating seed words.")
      this.props.cancel()
      console.warn(e)
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
          this.state.createSeedState.newSeed == null ? (
            <View style={styles.focalCenter}>
              <AnimatedActivityIndicator style={{ width: 128 }} />
            </View>
          ) : (
            <CreateSeed
              {...parentProps}
              saveState={(createSeedState) =>
                this.setState({ createSeedState })
              }
              initState={this.state.createSeedState}
              importSeed={() => this.setState({ firstTimeSeed: false })}
            />
          )
        ) : (
          <ImportSeed
            {...parentProps}
            saveState={(importSeedState) =>
              this.setState({ importSeedState })
            }
            initState={this.state.importSeedState}
            createSeed={() => this.setState({ firstTimeSeed: true })}
          />
        )}
      </Modal>
    );
  }
}

export default SetupSeedModal;