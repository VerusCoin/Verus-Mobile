import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  sheet: {
    zIndex: 20,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowOffset: {width: 0, height: -4},
    shadowRadius: 18,
    elevation: 8,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    height: 52,
    paddingHorizontal: 20,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  handle: {
    position: 'absolute',
    top: 10,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {flex: 1},
  chevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {flex: 1},
});
