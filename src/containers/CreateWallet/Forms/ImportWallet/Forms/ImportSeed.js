import {validateMnemonic, wordlists} from 'bip39';
import React, {useEffect, useState} from 'react';
import {
  View,
  Dimensions,
  Keyboard,
  TouchableOpacity,
  TouchableHighlight,
} from 'react-native';
import {
  Text,
  Button,
  Paragraph,
  TextInput,
  Chip,
  TouchableRipple,
} from 'react-native-paper';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import Colors from '../../../../../globals/colors';

export default function ImportSeed({
  setImportedSeed,
  importedSeed,
  onComplete,
}) {
  const {height} = Dimensions.get('window');

  const [currentWord, setCurrentWord] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const wordlist = wordlists.EN;

  const [words, setWords] = useState([]);
  const [isValidMnemonic, setIsValidMnemonic] = useState(
    validateMnemonic(importedSeed, wordlist),
  );

  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      event => {
        setKeyboardOffset(event.endCoordinates.height);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardOffset(0),
    );

    // returned function will be called on component unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (importedSeed != null && importedSeed.length > 0) {
      const seedSplit = importedSeed.split(' ');

      for (const word of seedSplit) {
        if (!wordlist.includes(word)) {
          setImportedSeed('');
          break;
        }
      }

      setWords(importedSeed.split(' '));
      setIsValidMnemonic(validateMnemonic(importedSeed, wordlist));
    } else {
      setWords([]);
      setIsValidMnemonic(false);
    }
  }, [importedSeed]);

  useEffect(() => {
    setCurrentWord(words[currentWordIndex] ? words[currentWordIndex] : '');
  }, [currentWordIndex]);

  const handleImport = () => {
    if (!importedSeed || importedSeed.length < 1) {
      createAlert('Error', 'Please enter a mnemonic seed.');
    } else if (!validateMnemonic(importedSeed, wordlist)) {
      createAlert('Error', 'Invalid mnemonic seed.');
    } else {
      onComplete();
    }
  };

  const addWord = word => {
    const cleanWord = word.replace(/\s/g, '').toLowerCase();
    const wordKey = cleanWord.slice(0, 4);
    const fullWord = wordlist.find(x => x.slice(0, 4) === wordKey);

    if (fullWord == null) {
      createAlert('Invalid word', `'${cleanWord}' is not a valid seed word.`);
      return;
    }

    if (currentWordIndex >= words.length) {
      const newImportedSeed =
        importedSeed == null || importedSeed.length == 0
          ? fullWord
          : importedSeed + ' ' + fullWord;

      setImportedSeed(newImportedSeed);

      const newWords = newImportedSeed.split(' ');

      if (newWords.length == 24) {
        Keyboard.dismiss();
      } else {
        setCurrentWordIndex(newImportedSeed.split(' ').length);
      }
    } else {
      const newImportedSeedArr =
        importedSeed != null ? importedSeed.split(' ') : [];

      newImportedSeedArr[currentWordIndex] = fullWord;
      setImportedSeed(newImportedSeedArr.join(' '));

      Keyboard.dismiss();
    }
  };

  return (
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
          top: height / 2 - 250,
        }}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
          }}>
          {'Import 24-word Seed'}
        </Text>
        <View
          style={{
            justifyContent: 'flex-start',
            minWidth: '86%',
            maxWidth: '86%',
            flexDirection: 'row',
            marginTop: 64,
            flexWrap: 'wrap',
          }}>
          {words.map((word, index) => (
            <TouchableOpacity onPress={() => setCurrentWordIndex(index)}>
              <Chip
                style={{
                  margin: 2,
                }}
                selected={currentWordIndex === index}>{`${
                index + 1
              }. ${word}`}</Chip>
            </TouchableOpacity>
          ))}
          {words.length > 0 && words.length < 24 && (
            <TouchableOpacity onPress={() => setCurrentWordIndex(words.length)}>
              <Chip
                selected={currentWordIndex === words.length}
                style={{margin: 2}}>
                {'+ Add Word'}
              </Chip>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View
        style={
          keyboardOffset !== 0
            ? {
                position: 'absolute',
                bottom: keyboardOffset + 16,
                width: '75%',
                flexDirection: 'row',
                alignItems: 'center',
              }
            : {
                position: 'absolute',
                top: height / 2 - 210,
                width: '75%',
                flexDirection: 'row',
                alignItems: 'center',
              }
        }>
        <TextInput
          onChangeText={text => setCurrentWord(text)}
          label={`Word ${currentWordIndex + 1}`}
          underlineColor={Colors.primaryColor}
          selectionColor={Colors.primaryColor}
          autoCapitalize={'none'}
          autoCorrect={false}
          autoComplete="off"
          value={currentWord}
          dense
          mode="outlined"
          style={{
            width: '70%',
          }}
        />
        <Button
          onPress={() => addWord(currentWord)}
          mode="contained"
          labelStyle={{fontWeight: 'bold', paddingTop: 2}}
          style={{height: 41, marginTop: 6, width: '25%', marginLeft: '5%'}}
          disabled={currentWord == null || currentWord.length == 0}>
          {'Next'}
        </Button>
      </View>
      <Button
        onPress={handleImport}
        mode="contained"
        labelStyle={{fontWeight: 'bold'}}
        disabled={!isValidMnemonic}
        style={{
          position: 'absolute',
          bottom: 80,
          width: 280,
        }}>
        {'Import'}
      </Button>
    </View>
  );
}
