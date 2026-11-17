import {StyleSheet} from 'react-native';

export const PROGRESS_HEADER_METRICS = {
  top: 4,
  bottom: 8,
  horizontal: 24,
  contentInset: 16,
  action: 44,
  trackHeight: 3,
  trackGap: 4,
};

export default StyleSheet.create({
  container: {paddingBottom: PROGRESS_HEADER_METRICS.bottom},
  actionRow: {height: PROGRESS_HEADER_METRICS.action, flexDirection: 'row', alignItems: 'center'},
  progressTrack: {
    height: PROGRESS_HEADER_METRICS.trackHeight,
    marginHorizontal: PROGRESS_HEADER_METRICS.contentInset - PROGRESS_HEADER_METRICS.horizontal,
    marginTop: PROGRESS_HEADER_METRICS.trackGap,
    overflow: 'hidden',
    borderRadius: 999,
  },
  progressFill: {height: '100%', borderRadius: 999},
});
