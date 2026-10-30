import {StyleSheet} from 'react-native';
import Colors from '../../globals/colors';

export default StyleSheet.create({
  identityName: {
    color: Colors.primaryColor,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  requestContext: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingBottom: 16,
    marginBottom: 20,
  },
  requester: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  requesterText: {flex: 1},
  requesterName: {fontSize: 16, fontWeight: '600', color: Colors.quaternaryColor},
  requestMetadata: {fontSize: 13, color: '#666', marginTop: 8},
  unsignedRequest: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  controlsNotice: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    marginBottom: 16,
  },
  continueNote: {fontSize: 14, lineHeight: 20, color: '#666', marginTop: 8},
  bottomSpacer: {height: 24},
});
