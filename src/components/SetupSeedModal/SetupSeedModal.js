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
    this.seedSessionOpen = !!props.visible;
    this.seedSubmission = null;
    this.state = {
      firstTimeSeed: props.importOnly ? false : true,
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
      loadingSeed: true,
      submittingSeed: false,
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
      this.cancel()
      console.warn(e)
    }
  }

  componentDidUpdate(lastProps) {
    if (lastProps.visible !== this.props.visible) {
      this.seedSessionOpen = !!this.props.visible;
      this.resetSeedSubmission();
    }
  }

  componentWillUnmount() {
    this.seedSessionOpen = false;
    this.seedSubmission = null;
  }

  resetSeedSubmission = () => {
    this.seedSubmission = null;
    this.setState({ submittingSeed: false });
  };

  cancel = () => {
    this.seedSessionOpen = false;
    this.resetSeedSubmission();
    this.props.cancel();
  };

  beginSeedSubmission = () => {
    if (!this.props.visible || !this.seedSessionOpen || this.seedSubmission) return null;
    const submission = {};
    this.seedSubmission = submission;
    this.setState({ submittingSeed: true });
    return submission;
  };

  seedSubmissionIsCurrent = submission =>
    this.props.visible && this.seedSessionOpen && this.seedSubmission === submission;

  failSeedSubmission = submission => {
    if (!this.seedSubmissionIsCurrent(submission)) return false;
    this.resetSeedSubmission();
    return true;
  };

  completeSeedSubmission = (submission, seed) => {
    if (!this.seedSubmissionIsCurrent(submission)) return;
    // Close this session before invoking callers that may update other modals.
    this.seedSessionOpen = false;
    this.props.setSeed(seed, this.props.channel);
    this.cancel();
  };

  changeSeedMode = firstTimeSeed => {
    this.resetSeedSubmission();
    this.setState({ firstTimeSeed });
  };

  render() {
    const { channel, importOnly } = this.props
    const parentProps = {
      cancel: this.cancel,
      beginSeedSubmission: this.beginSeedSubmission,
      failSeedSubmission: this.failSeedSubmission,
      completeSeedSubmission: this.completeSeedSubmission,
      submittingSeed: this.state.submittingSeed,
      channel
    }
    return (
      <Modal
        animationType={this.props.animationType}
        transparent={false}
        visible={this.props.visible}
        onRequestClose={this.cancel}
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
              importSeed={() => this.changeSeedMode(false)}
            />
          )
        ) : (
          <ImportSeed
            {...parentProps}
            saveState={(importSeedState) =>
              this.setState({ importSeedState })
            }
            initState={this.state.importSeedState}
            backLabel={importOnly ? "Cancel" : "Back"}
            onBack={importOnly ? this.cancel : () => this.changeSeedMode(true)}
          />
        )}
      </Modal>
    );
  }
}

export default SetupSeedModal;
