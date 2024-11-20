/*
  This component creates a modal with options to 
  either import or create a user seed for account setup
*/

import React, { Component } from "react"
import {
  ScrollView,
  View,
  TextInput as NativeTextInput,
  Alert
} from "react-native"
import Styles from '../../../styles/index'
import { Button, TextInput, Text } from 'react-native-paper'
import Colors from '../../../globals/colors'
import { DEFAULT_SEED_PHRASE_LENGTH } from "../../../utils/constants/constants"
import { DLIGHT_PRIVATE, WYRE_SERVICE } from "../../../utils/constants/intervalConstants"

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
      if (this.state.formStep > this.state.newSeedWords.length / 8) {
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

    const isAtEnd = formStep > newSeedWords.length / 8
    const isAtWordPhase = !(formStep === 0 || isAtEnd)
    const firstIndex = (formStep - 1) * 8
    const displayWords = isAtWordPhase ? newSeedWords.slice(firstIndex, firstIndex + 8) : []

    return (
      <ScrollView style={Styles.flexBackground} contentContainerStyle={Styles.centerContainer}>
        <View style={Styles.headerContainer}>
          <Text style={Styles.centralHeader}>{"Seed Setup"}</Text>
        </View>
        {formStep === 0 && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <Text style={Styles.centralLightTextPadded}>
              {`You will now be shown a sequence of ${DEFAULT_SEED_PHRASE_LENGTH} words.`}
            </Text>
            <Text style={Styles.centralLightTextPadded}>
              {"This sequence of words is a seed phrase, a secret key used to access your wallet."}
            </Text>
            <Text style={Styles.centralLightTextPadded}>
              {"Write each word down, seperated by a space, and keep your words safe."}
            </Text>
            <Text style={Styles.centralInfoTextPadded}>
              {"Anyone with access to your words, will have full access to your wallet."}
            </Text>
            <View style={Styles.centralInfoTextPadded}>
              <Text style={{ ...Styles.defaultText, textAlign: "center" }}>
                {"Press next to continue, or "}
              </Text>
              <Text
                style={{ ...Styles.linkText, textAlign: "center" }}
                onPress={this.props.importSeed}
              >
                {this.props.channel === WYRE_SERVICE
                  ? "import an existing 24 word seed phrase"
                  : this.props.channel === DLIGHT_PRIVATE
                  ? "import an existing seed phrase/spending key."
                  : "import an existing seed/wallet."}
              </Text>
            </View>
          </View>
        )}
        {isAtWordPhase && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {displayWords.map((word, index) => {
                return (
                  <View key={index} style={{ flex: 1, minWidth: "50%" }}>
                    <Text style={Styles.centralInfoTextPadded}>{`Word #${
                      firstIndex + index + 1
                    }:`}</Text>
                    <Text style={Styles.seedWord}>{word}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={Styles.centralLightTextPadded}>
              {"When you've written them down, press next."}
            </Text>
          </View>
        )}
        {isAtEnd && (
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            {randomIndices.map((randomI, index) => {
              return (
                <View key={index} style={Styles.fullWidthAlignCenterRowBlock}>
                  <TextInput
                    returnKeyType="done"
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
                        autoComplete="off"
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
              textColor={Colors.warningButtonColor}
            >
              {formStep === 0 ? "Cancel" : "Back"}
            </Button>
            <Button textColor={Colors.primaryColor} onPress={isAtEnd ? this.verifySeed : this.next}>
              {isAtEnd ? "Done" : "Next"}
            </Button>
          </View>
        </View>
      </ScrollView>
    );
  }
}

export default CreateSeed;