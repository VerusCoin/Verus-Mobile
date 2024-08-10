import React, {useEffect, useState} from 'react';
import {
  View,
  Dimensions,
  Keyboard,
  TextInput as NativeTextInput,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import {Text, Button, TextInput} from 'react-native-paper';
import {useSelector} from 'react-redux';
import TallButton from '../../../../../components/LargerButton';
import Colors from '../../../../../globals/colors';
import {DEFAULT_SEED_PHRASE_LENGTH} from '../../../../../utils/constants/constants';

export default function SeedWords({navigation, newSeed, onComplete}) {
  const {height} = Dimensions.get('window');

  const isKeyboardActive = useSelector(state => state.keyboard.active);

  const [formStep, setFormStep] = useState(0);
  const [seedWords, setSeedWords] = useState(newSeed.split(' '));

  const [isAtEnd, setIsAtEnd] = useState(formStep >= seedWords.length / 8);
  const [firstIndex, setFirstIndex] = useState(formStep * 8);
  const [displayWords, setDisplayWords] = useState(
    !isAtEnd ? seedWords.slice(firstIndex, firstIndex + 8) : [],
  );

  const [randomIndices, setRandomIndices] = useState([0, 0, 0]);

  const [wordGuesses, setWordGuesses] = useState(['', '', '']);
  const [wordErrors, setWordErrors] = useState([false, false, false]);

  const resetForm = () => {
    setFormStep(0);
    setSeedWords(newSeed.split(' '));
  };

  const getRandIndex = (exclusions = []) => {
    let rand = Math.round(Math.random() * (DEFAULT_SEED_PHRASE_LENGTH - 1));

    while (exclusions.includes(rand)) {
      rand = Math.round(Math.random() * (DEFAULT_SEED_PHRASE_LENGTH - 1));
    }

    return rand;
  };

  const verifySeed = () => {
    setWordErrors([false, false, false]);

    let errors = false;
    let guessErrors = [false, false, false];

    wordGuesses.map((wordGuess, index) => {
      if (wordGuess !== seedWords[randomIndices[index]]) {
        errors = true;
        guessErrors[index] = true;
      }
    });

    if (errors) {
      Alert.alert('Incorrect', 'One or more words do not match.');
    }

    setWordErrors(guessErrors);

    if (!errors) {
      onComplete();
    }
  };

  const next = () => {
    if (isAtEnd) {
      verifySeed();
    } else {
      setFormStep(formStep + 1);
    }
  };

  const back = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    }
  };

  useEffect(() => {
    resetForm();
  }, [newSeed]);

  useEffect(() => {
    setIsAtEnd(formStep >= seedWords.length / 8);
    setFirstIndex(formStep * 8);
  }, [formStep, newSeed]);

  useEffect(() => {
    setDisplayWords(
      !isAtEnd ? seedWords.slice(firstIndex, firstIndex + 8) : [],
    );
  }, [firstIndex, isAtEnd]);

  useEffect(() => {
    if (isAtEnd) {
      const first = getRandIndex();
      const second = getRandIndex([first]);
      const third = getRandIndex([first, second]);

      setRandomIndices([first, second, third]);
    }
  }, [isAtEnd]);

  useEffect(() => {
    setWordErrors([false, false, false]);
  }, [wordGuesses, randomIndices]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
          backgroundColor: Colors.secondaryColor,
        }}>
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height / 2 - 200,
          }}>
          {isAtEnd ? (
            <View
              style={{
                alignSelf: 'center',
                width: '75%',
                justifyContent: 'center',
              }}>
              {randomIndices.map((randomI, index) => {
                return (
                  <View
                    key={index}
                    style={{
                      width: '100%',
                      alignItems: 'center',
                      paddingVertical: 8,
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}>
                    <TextInput
                      returnKeyType="done"
                      dense
                      style={{width: '100%'}}
                      onChangeText={text => {
                        let newGuesses = [...wordGuesses];

                        newGuesses[index] = text;
                        setWordGuesses(newGuesses);
                      }}
                      label={`Enter word ${randomI + 1}:`}
                      underlineColor={Colors.primaryColor}
                      selectionColor={Colors.primaryColor}
                      mode="outlined"
                      render={props => (
                        <NativeTextInput
                          autoCapitalize={'none'}
                          autoCorrect={false}
                          autoComplete="off"
                          {...props}
                        />
                      )}
                      error={wordErrors[index]}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={{
                alignSelf: 'center',
                width: '75%',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {displayWords.map((word, index) => {
                  return (
                    <View
                      key={index}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '100%',
                        paddingTop: 8,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          paddingTop: 2,
                          paddingRight: 8,
                        }}>{`Word ${firstIndex + index + 1}:`}</Text>
                      <Text
                        style={{
                          fontSize: 20,
                          color: Colors.primaryColor,
                          textAlign: 'left',
                          fontWeight: 'bold',
                        }}>
                        {word}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        {!isKeyboardActive && (
          <View
            style={{
              position: 'absolute',
              bottom: 40,
              width: 280,
            }}>
            <Text style={{textAlign: 'center', paddingBottom: 8}}>
              {isAtEnd
                ? 'Please verify the listed words.'
                : "When you've written them down, press next."}
            </Text>
            <View style={{flexDirection: "row"}}>
              {formStep > 0 && (
                <TallButton
                  onPress={back}
                  mode="text"
                  labelStyle={{
                    fontWeight: 'bold',
                    color: Colors.warningButtonColor,
                  }}
                  style={{
                    marginTop: 8,
                    flex: 1
                  }}>
                  {'Back'}
                </TallButton>
              )}
              <TallButton
                onPress={next}
                mode="contained"
                disabled={
                  isAtEnd &&
                  (wordGuesses[0].length == 0 ||
                    wordGuesses[1].length == 0 ||
                    wordGuesses[2].length == 0)
                }
                labelStyle={{fontWeight: 'bold'}}
                style={{
                  marginTop: 8,
                  flex: 1
                }}>
                {isAtEnd ? 'Complete' : 'Next'}
              </TallButton>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
