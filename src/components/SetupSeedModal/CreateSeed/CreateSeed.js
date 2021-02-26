/*
  This component creates a modal with options to 
  either import or create a user seed for account setup
*/

import React, { Component } from "react"
import {
  Text,
  ScrollView,
  View,
  TextInput as NativeTextInput,
  Alert
} from "react-native"
import Styles from '../../../styles/index'
import { Button, TextInput } from 'react-native-paper'
import Colors from '../../../globals/colors'
import { DEFAULT_SEED_PHRASE_LENGTH } from "../../../utils/constants/constants"

class CreateSeed extends Component {
  constructor(props) {
    super(props);
    this.state = props.initState
  }

  componentDidUpdate(lastProps, lastState) {
    if (lastState !== this.state) this.props.saveState(this.state)
  }

  cancel = () => {
    if (this.props.cancel) {
      this.props.cancel();
    }
  };

  goBack = () => {
    this.setState({ formStep: this.state.formStep - 1 })
  }

  getRandIndex = (exclusions = []) => {
    let rand = Math.round(Math.random() * (DEFAULT_SEED_PHRASE_LENGTH - 1))

    while (exclusions.includes(rand)) {
      rand = Math.round(Math.random() * (DEFAULT_SEED_PHRASE_LENGTH - 1))
    }

    return rand
  }

  next = () => {
    this.setState({ formStep: this.state.formStep + 1 }, () => {
      if (this.state.formStep > DEFAULT_SEED_PHRASE_LENGTH) {
        const first = this.getRandIndex()
        const second = this.getRandIndex([first])
        const third = this.getRandIndex([first, second])

        this.setState({randomIndices: [first, second, third], guessErrors: [false, false, false]})
      }
    })
  }

  verifySeed = () => {
    const { wordGuesses, newSeedWords, randomIndices } = this.state

    this.setState({ guessErrors: [false, false, false] }, () => {
      let errors = false
      let guessErrors = [false, false, false]

      wordGuesses.map((wordGuess, index) => {
        if (wordGuess !== newSeedWords[randomIndices[index]]) {
          errors = true
          guessErrors[index] = true
        }
      })

      if (errors) Alert.alert("Incorrect", "One or more words do not match.")

      this.setState({ guessErrors })

      if (!errors) {
        this.props.setSeed(this.state.newSeed, this.props.channel)
        this.props.cancel()
      }
    })
  }

  render() {
    const {
      formStep,
      wordGuesses,
      randomIndices,
      guessErrors,
      newSeedWords
    } = this.state;

    return (
      <ScrollView
        style={Styles.flexBackground}
        contentContainerStyle={Styles.centerContainer}
      >
        <View style={Styles.headerContainer}>
          <Text style={Styles.centralHeader}>{"Seed Setup"}</Text>
        </View>
        {formStep === 0 && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <Text style={Styles.centralLightTextPadded}>
              {`You will now be shown a sequence of ${DEFAULT_SEED_PHRASE_LENGTH} words.`}
            </Text>
            <Text style={Styles.centralLightTextPadded}>
              {
                "This sequence of words is a seed phrase, a secret key used to access your wallet."
              }
            </Text>
            <Text style={Styles.centralLightTextPadded}>
              {
                "Write each word down, seperated by a space, and keep your words safe."
              }
            </Text>
            <Text style={Styles.centralInfoTextPadded}>
              {
                "Anyone with access to your words, will have full access to your wallet."
              }
            </Text>
            <View style={Styles.centralInfoTextPadded}>
              <Text style={{ ...Styles.defaultText, textAlign: "center" }}>
                {"Press next to continue, or "}
              </Text>
              <Text
                style={{ ...Styles.linkText, textAlign: "center" }}
                onPress={this.props.importSeed}
              >
                {"import an existing seed/wallet."}
              </Text>
            </View>
          </View>
        )}
        {formStep > 0 && formStep < DEFAULT_SEED_PHRASE_LENGTH + 1 && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <Text style={Styles.centralInfoTextPadded}>
              {`Word #${formStep}:`}
            </Text>
            <Text style={Styles.seedWord}>
              {newSeedWords[formStep - 1]}
            </Text>
            <Text style={Styles.centralLightTextPadded}>
              {"When you've written it down, press next."}
            </Text>
          </View>
        )}
        {formStep > DEFAULT_SEED_PHRASE_LENGTH && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            {randomIndices.map((randomI, index) => {
              return (
                <View key={index} style={Styles.fullWidthAlignCenterRowBlock}>
                  <TextInput
                    dense
                    style={Styles.flex}
                    onChangeText={(text) => {
                      let newGuesses = [...wordGuesses];

                      newGuesses[index] = text;
                      this.setState({ wordGuesses: newGuesses });
                    }}
                    label={`Enter word #${randomI + 1}:`}
                    underlineColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    render={(props) => (
                      <NativeTextInput
                        autoCapitalize={"none"}
                        autoCorrect={false}
                        {...props}
                      />
                    )}
                    error={guessErrors[index]}
                  />
                </View>
              );
            })}
          </View>
        )}
        <View style={Styles.footerContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button
              onPress={formStep === 0 ? this.cancel : this.goBack}
              color={Colors.warningButtonColor}
            >
              {formStep === 0 ? "Cancel" : "Back"}
            </Button>
            <Button
              color={Colors.primaryColor}
              onPress={
                formStep > DEFAULT_SEED_PHRASE_LENGTH
                  ? this.verifySeed
                  : this.next
              }
            >
              {formStep > DEFAULT_SEED_PHRASE_LENGTH ? "Done" : "Next"}
            </Button>
          </View>
        </View>
      </ScrollView>
    );
  }
}

export default CreateSeed;