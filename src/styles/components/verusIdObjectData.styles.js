/*
  VerusIdObjectData.styles 
  - Shared badge and content-card styles for VerusID object rendering.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// keep VerusID change-card presentation centralized and out of the data renderer.
export default StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
  },
  cmmDescLine: {
    color: Colors.verusDarkGray,
    fontSize: 12,
  },
  cmmDescMuted: {
    color: Colors.verusDarkGray,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  cmmCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cmmCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cmmCardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  cmmCardDescBlock: {
    borderLeftWidth: 3,
    borderRadius: 2,
    paddingLeft: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  cmmCardDescLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cmmCardDescValue: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
});
