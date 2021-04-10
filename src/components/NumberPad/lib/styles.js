import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  input: {
    width: '100%',
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  display: {
    padding: 20,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  activeDisplay: {
    backgroundColor: '#f8f8f8',
  },
  activeDisplayText: {},
  invalidDisplayText: {},
  displayText: {
    fontSize: 30,
    color: '#666',
  },
  placeholderDisplayText: {
    color: '#ddd',
  },
  cursor: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pad: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    width: '33%',
  },
  buttonText: {
    color: '#888',
    fontSize: 26,
    textAlign: 'center',
  },
  hide: {
    paddingVertical: 5,
    alignItems: 'center',
  },
  blinkOn: {
    borderBottomColor: '#ddd',
  },
  blinkOff: {
    borderBottomColor: 'transparent',
  },
});
