import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {ChevronRight, CircleAlert} from 'lucide-react-native';
import {useAppTheme} from '../../../../../theme/app';
import AppButton from '../../../../../components/AppButton';
import {registrationNoticeState} from '../../../../../utils/identityRegistration/noticeState';
import {VerusIdName} from '../VerusIdCard';
import {useRegistrationStyles} from './RegistrationDesign';

export const RegistrationGroupTitle = ({title, count}) => {
  const theme = useAppTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
    <Text style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>{title}</Text>
    <View style={{borderRadius: 10, paddingHorizontal: 6, backgroundColor: theme.colors.surfaceMuted}}>
      <Text style={[theme.typography.labelSm, {color: theme.colors.textSecondary}]}>{count}</Text>
    </View>
  </View>;
};

export default function RegistrationTabRows({jobs, navigation, group, children, showHeading = true, onLink}) {
  const theme = useAppTheme();
  const styles = useRegistrationStyles();
  const rows = Object.values(jobs || {}).filter(job => job.status !== 'complete' && (!group || registrationNoticeState(job).group === group))
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  const open = job => {
    if (job.status === 'registered') { onLink({jobId: job.id, name: job.displayName}); return; }
    navigation.navigate('IdentityRegistration', {screen: job.status === 'commitment_prepared' ? 'IdentityCommitmentReview' : 'IdentityRegistrationProgress', params: {jobId: job.id}});
  };
  if (!rows.length && !children) return null;
  return <View style={{gap: 8, marginBottom: 24}}>
    {!!rows.length && group && showHeading && <RegistrationGroupTitle title={group} count={rows.length} />}
    {rows.map(job => {
      const state = registrationNoticeState(job);
      return <View key={job.id} style={styles.job}><View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${job.displayName}. ${state.text}. ${state.action || 'View progress'}`} onPress={() => open(job)} style={styles.flexible}>
          <VerusIdName name={job.displayName || job.name} style={theme.typography.titleRow} leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />
          {!!state.text && <View style={[styles.row, {gap: 4}]}>
            {!!state.tone && <CircleAlert size={14} color={theme.colors[`${state.tone}Text`]} />}
            <Text style={[styles.muted, state.tone && {color: theme.colors[`${state.tone}Text`]}, {flexShrink: 1}]}>{state.text}</Text>
          </View>}
        </Pressable>
        {state.action ? <AppButton compact height={32} preserveHeightOnSmallWindow variant="secondary" buttonColor={theme.colors.surface}
          labelStyle={theme.typography.labelSm} onPress={() => open(job)}>{state.action}</AppButton>
          : <Pressable accessibilityRole="button" accessibilityLabel={`View progress for ${job.displayName}`} onPress={() => open(job)} style={styles.iconButton}><ChevronRight size={20} color={theme.colors.textSubtle} /></Pressable>}
      </View></View>;
    })}
    {children}
  </View>;
}
