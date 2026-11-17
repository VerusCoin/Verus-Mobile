import React, {useEffect, useMemo, useState} from 'react';
import {Text} from 'react-native-paper';
import StatusBadge from '../../../../components/StatusBadge';
import SkeletonLoader, {SkeletonSection} from '../../../../components/SkeletonLoader';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {requestCardStyles as createStyles} from '../../../../styles';
import DeepLinkRequestInfoSection from './DeepLinkRequestInfoSection';
import DeepLinkRequestSheetScaffold from './DeepLinkRequestSheetScaffold';
import {buildVerusIdSections} from './DeepLinkVerusIdDetailsSheet';
import RequestName from './RequestName';

const DeepLinkRequesterSheet = ({
  visible,
  onClose,
  requesterName,
  requesterAddress,
  verified,
  loadVerusId,
  loadFriendlyNames,
  sections = [],
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [identity, setIdentity] = useState(null);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!visible) return () => { active = false; };

    setLoading(true);
    setFailed(false);
    setIdentity(null);
    setNames({});
    Promise.resolve()
      .then(loadVerusId)
      .then(async value => {
        const friendlyNames = value && loadFriendlyNames
          ? await loadFriendlyNames(value)
          : {};
        if (active) {
          setIdentity(value);
          setNames(friendlyNames || {});
        }
      })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [loadFriendlyNames, loadVerusId, visible]);

  const mergedSections = useMemo(() => {
    const addressRow = {
      label: 'VerusID address',
      value: requesterAddress,
      copy: true,
      valueStyle: styles.identifier,
    };
    // One VerusID section: the private address row would repeat its own section title.
    const identitySections = buildVerusIdSections(identity, names).map(section => ({
      ...section,
      title: ['Identity', 'Private address'].includes(section.title)
        ? 'VerusID'
        : section.title,
      rows: section.rows
        .filter(row => section.title !== 'Identity' ||
          !['Name', 'Fully qualified name'].includes(row.label))
        .map(row => {
          if (row.label === 'i-Address') {
            return {...addressRow, value: row.value};
          }
          if (row.label === 'Private address' || row.label.startsWith('Primary address')) {
            return {...row, valueStyle: styles.identifier};
          }
          return row;
        }),
    }));
    const network = sections
      .flatMap(section => section.rows)
      .find(row => row?.label === 'Network')?.value;
    const seen = new Set();
    const grouped = new Map();

    [
      {title: 'Requester', rows: identity ? [] : [addressRow]},
      ...identitySections,
      ...sections,
    ].forEach(section => {
      const rows = section.rows.filter(row => {
        if (!row || row.value == null ||
          ['Requester', 'Requester address'].includes(row.label)) return false;
        if (row.label === 'System' && row.value === network) return false;
        const label = row.label.startsWith('Response URI') ? 'Response URI' : row.label;
        const key = `${label}:${row.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (rows.length) {
        grouped.set(section.title, [...(grouped.get(section.title) || []), ...rows]);
      }
    });
    return [...grouped].map(([title, rows]) => ({
      title,
      rows: rows.map(row => ({...row, labelStyle: styles.detailLabel})),
    }));
  }, [identity, names, requesterAddress, sections, styles]);

  return (
    <DeepLinkRequestSheetScaffold
      visible={visible}
      onClose={onClose}
      maxHeight="78%"
      title={<RequestName name={requesterName} />}
      headerAccessory={verified ? <StatusBadge label="Verified" tone="success" /> : undefined}>
      {loading && (
        <SkeletonLoader accessibilityLabel="Loading VerusID details">
          <SkeletonSection rows={[{labelWidth: '30%', valueWidth: '90%'}]} />
        </SkeletonLoader>
      )}
      {failed && (
        <Text style={[theme.typography.bodySm, styles.detailLabel]}>
          Unable to load VerusID details. Close this sheet and try again.
        </Text>
      )}
      {mergedSections.map(section => (
        <DeepLinkRequestInfoSection key={section.title} {...section} />
      ))}
    </DeepLinkRequestSheetScaffold>
  );
};

export default DeepLinkRequesterSheet;
