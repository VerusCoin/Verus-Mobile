/*
  VerusIdObjectData
  - 2026-01-24: Fixed accordion title colors to use neutral black instead of blue when expanded.
    Added titleStyle prop with Colors.quinaryColor to override default theme color.
  - 2026-02-05: Added optional change badges (icons + labels) for identity content updates.
    Replaced red/green-only update styling with explicit New/From/To text and encrypted flags.
  - 2026-02-06: Introduced 'appended' change type for CMM keys that already exist on the identity.
    ContentMultiMap is additive by default, so adding values to an existing key now shows
    "Adding" badge (green) with "Existing: / Adding:" labels instead of the misleading
    "Updated" badge with "From: / To:" strikethrough labels.
  - 2026-02-06: Redesigned CMM change items as card-based layout when showChangeBadges is true.
    Title gets its own row, badges sit below it, and description blocks use left accent bars
    with truncated previews for cleaner scanning.
*/
import React, { useEffect, useState } from 'react';
import { Clipboard, FlatList, TouchableOpacity, Alert, View, Image, ScrollView, StyleSheet } from 'react-native';
import { Text, List, Divider, Paragraph } from 'react-native-paper';
import Colors from '../globals/colors';
import Styles from '../styles';
import { Revoke, Recover, Coins } from '../images/customIcons';
import { openUrl } from "../utils/linking";
import AnimatedSuccessCheckmark from "./AnimatedSuccessCheckmark";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVerusIdStatus } from '../utils/verusid/getVerusIdStatus';
import { 
  VERUSID_AUTH_INFO, 
  VERUSID_BASE_INFO, 
  VERUSID_CMM_DATA, 
  VERUSID_CMM_INFO, 
  VERUSID_IADDRESS, 
  VERUSID_NAME, 
  VERUSID_PRIMARY_ADDRESS, 
  VERUSID_PRIVATE_ADDRESS, 
  VERUSID_PRIVATE_INFO, 
  VERUSID_RECOVERY_AUTH, 
  VERUSID_REVOCATION_AUTH, 
  VERUSID_STATUS, 
  VERUSID_SYSTEM, 
  VERUSID_WARNING_RECOVER, 
  VERUSID_WARNING_REVOKE, 
  VERUSID_WARNING_SPEND_AND_SIGN, 
  VERUSID_WARNINGS 
} from '../utils/constants/verusidObjectData';
import { getCmmDataLabel } from '../utils/vdxf/cmmDataLabel';
import { getVDXFKeyLabel } from '../utils/vdxf/vdxfTypeLabels';
import { capitalizeString } from '../utils/stringUtils';

const checkmark = (<AnimatedSuccessCheckmark style={{ width: 20, marginRight: 5, marginBottom: 1, alignSelf: 'flex-end', }} />);

const triangle = <MaterialCommunityIcons name={'information'} size={20} color={Colors.warningButtonColor} style={{ width: 20, marginRight: 9, alignSelf: 'flex-end', }} />;

const LocalStyles = StyleSheet.create({
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
  // Card-based CMM item styles
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

export default function VerusIdObjectData(props) {
  const { 
    friendlyNames, 
    verusId, 
    StickyFooterComponent, 
    flex, 
    ownedByUser, 
    ownedAddress, 
    updates, 
    hideUnchanged, 
    scrollDisabled, 
    containerStyle,
    hideDataOnLoad,
    chainInfo,
    coinObj,
    cmmDataKeys,
    extraListItems,
    showChangeBadges
  } = props;
  
  const [listData, setListData] = useState([]);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  const getCmmDataPreview = (data, maxItems = 3, maxLen = 80) => {
    const trim = (value) => {
      if (value == null) return 'null';
      const str = String(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
    };

    const formatValue = (value) => {
      if (Array.isArray(value)) {
        const items = value.map((entry) => formatValue(entry));
        const shown = items.slice(0, maxItems).join(' | ');
        return items.length > maxItems ? `${shown} +${items.length - maxItems} more` : shown;
      }

      if (typeof value === 'object' && value != null) {
        const keys = Object.keys(value);
        if (keys.length === 1) {
          const key = keys[0];
          const label = getVDXFKeyLabel(key, true) || key;
          return `${label}: ${formatValue(value[key])}`;
        }

        return `${keys.length} fields`;
      }

      return trim(value);
    };

    return formatValue(data);
  };

  const isContentMultiMapRemove = (rawData) => {
    const isRemoveObj = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
      const keys = Object.keys(obj);
      if (keys.length !== 1) return false;
      return getVDXFKeyLabel(keys[0], true) === 'content multi map remove';
    };

    if (isRemoveObj(rawData)) return true;
    if (Array.isArray(rawData)) return rawData.some(isRemoveObj);
    return false;
  };

  const getCmmChangeType = (hasExisting, updateEntry) => {
    if (!updateEntry) return null;
    if (isContentMultiMapRemove(updateEntry.rawData)) return 'removed';
    if (!hasExisting) return 'added';
    return 'appended';
  };

  const getChangeBadgeConfig = (changeType) => {
    switch (changeType) {
      case 'added':
        return { icon: 'plus-circle-outline', label: 'Added', color: Colors.verusGreenColor };
      case 'appended':
        return { icon: 'plus-circle-outline', label: 'Adding', color: Colors.verusGreenColor };
      case 'removed':
        return { icon: 'minus-circle-outline', label: 'Removed', color: Colors.warningButtonColor };
      default:
        return null;
    }
  };

  const getBadgeList = (item) => {
    const badges = [];
    const baseBadge = getChangeBadgeConfig(item.changeType);
    if (baseBadge) badges.push(baseBadge);
    if (item.isEncrypted) {
      badges.push({ icon: 'lock-outline', label: 'Encrypted', color: Colors.verusDarkGray });
    }
    return badges;
  };

  const renderChangeBadges = (item) => {
    const badges = getBadgeList(item);
    if (badges.length === 0) return null;

    return (
      <View style={LocalStyles.badgeRow}>
        {badges.map((badge, idx) => (
          <View
            key={`${badge.label}-${idx}`}
            style={[LocalStyles.badge, { borderColor: badge.color }]}
          >
            <MaterialCommunityIcons
              name={badge.icon}
              size={12}
              color={badge.color}
              style={LocalStyles.badgeIcon}
            />
            <Text style={[LocalStyles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const truncatePreview = (text, maxLen = 60) => {
    if (text == null) return '';
    const str = String(text);
    return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
  };

  const renderCmmDescBlock = (label, value, borderColor, muted = false) => (
    <View style={[LocalStyles.cmmCardDescBlock, { borderLeftColor: borderColor }]}>
      <Text style={[LocalStyles.cmmCardDescLabel, { color: borderColor }]}>{label}</Text>
      <Text
        style={[
          LocalStyles.cmmCardDescValue,
          muted && { textDecorationLine: 'line-through', color: '#999' }
        ]}
        numberOfLines={2}
      >
        {truncatePreview(value, 80) || 'Unknown'}
      </Text>
    </View>
  );

  const renderCmmChangeDescription = (item, updateEntry) => {
    const updatedPreview = item.isEncrypted
      ? 'Encrypted upload (tap to view)'
      : (item.updatedData ?? updateEntry?.data ?? item.data);

    if (item.changeType === 'added') {
      return renderCmmDescBlock('New', updatedPreview || 'New value', Colors.verusGreenColor);
    }

    if (item.changeType === 'removed') {
      return renderCmmDescBlock('Removing', item.data || 'Unknown value', Colors.warningButtonColor, true);
    }

    if (item.changeType === 'appended') {
      return (
        <>
          {item.data != null && renderCmmDescBlock('Existing', item.data, '#CCC')}
          {renderCmmDescBlock('Adding', updatedPreview || 'New value', Colors.verusGreenColor)}
        </>
      );
    }

    return (
      <Text style={{ color: Colors.verusDarkGray }}>
        {item.dataInDescription ? item.data : item.title}
      </Text>
    );
  };

  const renderCmmCard = (item, updateEntry) => {
    const badges = getBadgeList(item);
    const onPress = (updateEntry && updateEntry.onPress) ? updateEntry.onPress : item.onPress;

    return (
      <TouchableOpacity
        key={item.key}
        style={LocalStyles.cmmCard}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        {/* Title row */}
        <Text style={LocalStyles.cmmCardTitle}>{item.title}</Text>

        {/* Badge row */}
        {badges.length > 0 && (
          <View style={LocalStyles.cmmCardBadgeRow}>
            {badges.map((badge, idx) => (
              <View
                key={`${badge.label}-${idx}`}
                style={[LocalStyles.badge, { borderColor: badge.color }]}
              >
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={12}
                  color={badge.color}
                  style={LocalStyles.badgeIcon}
                />
                <Text style={[LocalStyles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description blocks */}
        {renderCmmChangeDescription(item, updateEntry)}
      </TouchableOpacity>
    );
  };

  const getDisplayUpdates = () => {
    const updateFrame = {
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_AUTH_INFO.key]: {},
      [VERUSID_PRIVATE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {},
      [VERUSID_WARNINGS.key]: {}
    }

    if (updates) {
      for (const groupKey in updates) {
        updateFrame[groupKey] = { ...updates[groupKey] };
      }
    }

    const cmmUpdates = updateFrame[VERUSID_CMM_INFO.key];
    if (cmmUpdates) {
      for (const key in cmmUpdates) {
        const entry = cmmUpdates[key];
        if (entry && entry.rawData != null) {
          cmmUpdates[key] = {
            ...entry,
            data: getCmmDataPreview(entry.rawData)
          };
        }
      }
    }

    return updateFrame
  };

  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates());

  useEffect(() => {
    setDisplayUpdates(getDisplayUpdates());
  }, [updates, cmmDataKeys]);

  tryDisplayFriendlyName = iAddr => {
    return friendlyNames[iAddr] ? friendlyNames[iAddr] : iAddr;
  };

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);

    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) {
        return cmmDataKeys[iAddr].label;
      } else return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    } else return capitalizeString(keyLabel);
  }

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  const getWarningData = () => {
    const tmpwarningData = [{
      key: VERUSID_WARNING_SPEND_AND_SIGN.key,
      title: VERUSID_WARNING_SPEND_AND_SIGN.label,
      data: 'Owned by you',
      onPress: () => openUrl('https://docs.verus.io/verusid/#multisig'),
      warning: false,
      condition: 'warning',
      icon: (<Image source={Coins} style={{ aspectRatio: 1, height: 50, width: 50, alignSelf: 'center' }} />),
      status: checkmark
    }, {
      key: VERUSID_WARNING_REVOKE.key,
      title: VERUSID_WARNING_REVOKE.label,
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Revoke} style={{ aspectRatio: 1.1, height: 50, width: 50, alignSelf: 'center' }} />,
      status: checkmark
    }, {
      key: VERUSID_WARNING_RECOVER.key,
      title: VERUSID_WARNING_RECOVER.label,
      data: 'Set to this ID',
      onPress: () => openUrl('https://docs.verus.io/verusid/#revoke-recover'),
      warning: false,
      condition: 'warning',
      icon: <Image source={Recover} style={{ aspectRatio: 1, height: 50, width: 45, alignSelf: 'center' }} />,
      status: checkmark
    }];

    if ((ownedAddress && verusId.identity.primaryaddresses.length > 1) || (ownedAddress && !verusId.identity.primaryaddresses.includes(ownedAddress))) {
      tmpwarningData[0].warning = true;
      tmpwarningData[0].data = 'Funds can be spent by other addresses, see primary addresses below';
      tmpwarningData[0].status = triangle;
    }

    if (verusId.identity.revocationauthority !== verusId.identity.identityaddress) {
      let tmpRevAddr = `${tryDisplayFriendlyName(verusId.identity.revocationauthority)} `;
      if (tmpRevAddr.length > 30) { 
        tmpRevAddr = "[revocation ID listed below]"
      } 
      tmpwarningData[1].warning = true;
      tmpwarningData[1].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRevAddr}</Text> {`can revoke access to funds and signing`}</Text>)
      tmpwarningData[1].status = triangle;
    }

    if (verusId.identity.recoveryauthority !== verusId.identity.identityaddress) {
      let tmpRecAddr = `${tryDisplayFriendlyName(verusId.identity.recoveryauthority)} `;
      if (tmpRecAddr.length > 30) { 
        tmpRecAddr = "[recovery ID listed below]"
      } 
      tmpwarningData[2].warning = true;
      tmpwarningData[2].data = (<Text style={{ color: 'red'}}>{`Set to another VerusID, `}<Text style={{color: Colors.primaryColor}}>{tmpRecAddr}</Text> {`can change ID ownership`}</Text>)
      tmpwarningData[2].status = triangle;
    }
    return tmpwarningData;
  };

  useEffect(() => {
    if (friendlyNames != null && verusId != null) {
      let warningData = ownedByUser ? getWarningData() : [];
      
      const baseInfo = [
        {
          key: VERUSID_NAME.key,
          title: VERUSID_NAME.label,
          data: verusId.identity.name,
          onPress: () => copyDataToClipboard(verusId.identity.name, VERUSID_NAME.label),
        },
        {
          key: VERUSID_IADDRESS.key,
          title: VERUSID_IADDRESS.label,
          data: verusId.identity.identityaddress,
          onPress: () => copyDataToClipboard(verusId.identity.identityaddress, VERUSID_IADDRESS.label),
        },
        {
          key: VERUSID_STATUS.key,
          title: VERUSID_STATUS.label,
          data: chainInfo && coinObj ? getVerusIdStatus(verusId.identity, chainInfo, coinObj.seconds_per_block) : verusId.status,
          capitalized: true,
        },
        {
          key: VERUSID_SYSTEM.key,
          title: VERUSID_SYSTEM.label,
          data: tryDisplayFriendlyName(verusId.identity.systemid).replace(/@/g, ''),
          onPress: () => copyDataToClipboard(verusId.identity.systemid, VERUSID_SYSTEM.label),
        },
      ];
  
      const authorityInfo = [
        {
          key: VERUSID_REVOCATION_AUTH.key,
          title: VERUSID_REVOCATION_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.revocationauthority),
          onPress: () => copyDataToClipboard(verusId.identity.revocationauthority, VERUSID_REVOCATION_AUTH.label),
        },
        {
          key: VERUSID_RECOVERY_AUTH.key,
          title: VERUSID_RECOVERY_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.recoveryauthority),
          onPress: () => copyDataToClipboard(verusId.identity.recoveryauthority, VERUSID_RECOVERY_AUTH.label),
        },
      ];

      const privacyData = [];
      if (verusId.identity.privateaddress || (displayUpdates[VERUSID_PRIVATE_INFO.key][VERUSID_PRIVATE_ADDRESS.key])) {
        privacyData.push({
          key: VERUSID_PRIVATE_ADDRESS.key,
          title: VERUSID_PRIVATE_ADDRESS.label,
          data: verusId.identity.privateaddress || null,
          onPress: verusId.identity.privateaddress
            ? () => copyDataToClipboard(verusId.identity.privateaddress, VERUSID_PRIVATE_ADDRESS.key)
            : undefined,
        });
      }
  
      const primaryAddresses = [];
      const primaryAddressUpdates = Object.keys(displayUpdates[VERUSID_AUTH_INFO.key])
        .map(x => (x.split(":")[0] === VERUSID_PRIMARY_ADDRESS.key) ? displayUpdates[VERUSID_AUTH_INFO.key][x] : undefined)
        .filter(x => !!x);
      const primaryAddrs = verusId.identity.primaryaddresses;

      const numPrimaryAddrs = primaryAddrs.length > 
        primaryAddressUpdates.length ? 
          primaryAddrs.length 
          : 
          primaryAddressUpdates.length;
      
      for (let i = 0; i < numPrimaryAddrs; i++) {
        primaryAddresses.push({
          key: `${VERUSID_PRIMARY_ADDRESS.key}:${i}`,
          title: `${VERUSID_PRIMARY_ADDRESS.label} ${i + 1}`,
          data: primaryAddrs[i] ? primaryAddrs[i] : 'None',
          onPress: primaryAddrs[i]
            ? () => copyDataToClipboard(primaryAddrs[i], 'Primary Address')
            : undefined,
        });
      }

      primaryAddresses.sort((a, b) => b.key.localeCompare(a.key));

      const contentMultiMapInfo = {};

      if (verusId.identity.contentmultimap) {
        for (const iAddrKey in verusId.identity.contentmultimap) {
          const shortIAddr = getCmmDataKey(iAddrKey);
          const updateKey = `${VERUSID_CMM_DATA.key}:${iAddrKey}`;
          const updateEntry = displayUpdates[VERUSID_CMM_INFO.key][updateKey];
          const changeType = getCmmChangeType(true, updateEntry);

          contentMultiMapInfo[updateKey] = {
            key: updateKey,
            title: shortIAddr,
            data: getCmmDataLabel(verusId.identity.contentmultimap[iAddrKey]),
            dataInDescription: true,
            changeType,
            isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
            updatedData: updateEntry ? updateEntry.data : null
          };
        }
      }

      for (const key in displayUpdates[VERUSID_CMM_INFO.key]) {
        if (!contentMultiMapInfo[key]) {
          const iAddr = key.split(':')[1];
          const shortIAddr = getCmmDataKey(iAddr);
          const updateEntry = displayUpdates[VERUSID_CMM_INFO.key][key];
          const changeType = getCmmChangeType(false, updateEntry);
          
          contentMultiMapInfo[key] = {
            key,
            title: shortIAddr,
            data: updateEntry ? updateEntry.data : null,
            hideOldData: true,
            dataInDescription: true,
            changeType,
            isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
            updatedData: updateEntry ? updateEntry.data : null
          };
        }
      }
  
      // Build grouped data
      const groupedData = [
        { key: VERUSID_WARNINGS.key, title: VERUSID_WARNINGS.label, items: warningData },
        { key: VERUSID_BASE_INFO.key, title: VERUSID_BASE_INFO.label, items: baseInfo },
        { key: VERUSID_CMM_INFO.key, title: VERUSID_CMM_INFO.label, items: Object.values(contentMultiMapInfo) },
        { key: VERUSID_AUTH_INFO.key, title: VERUSID_AUTH_INFO.label, items: authorityInfo.concat(primaryAddresses) },
        { key: VERUSID_PRIVATE_INFO.key, title: VERUSID_PRIVATE_INFO.label, items: privacyData },
      ];
  
      // Filter out unchanged if hideUnchanged is true
      const finalGroups = groupedData.map(group => {
        const filtered = group.items.filter(item => {
          if (!hideUnchanged) return true;
          else return item.key && displayUpdates[group.key][item.key];
        }).sort((a, b) => {
          if (displayUpdates[group.key][a.key]) return -1;
          else if (displayUpdates[group.key][b.key]) return 1;
          return 1;
        });
        return { ...group, items: filtered };
      });
  
      setListData(finalGroups);

      if (!hideDataOnLoad) {
        const initialExpandedState = {};
        finalGroups.forEach((group, idx) => {
          initialExpandedState[idx] = true;
        });
        setExpandedAccordions(initialExpandedState);
      }
    }
  }, [verusId, friendlyNames, updates, cmmDataKeys, chainInfo, coinObj, hideUnchanged, hideDataOnLoad]);

  copyDataToClipboard = (data, name) => {
    Clipboard.setString(data);

    Alert.alert(`${name} Copied`, `${data} copied to clipboard.`);
  };

  return (
    <View style={containerStyle ? containerStyle : flex ? { ...Styles.fullWidth, flex: 1 } : { ...Styles.fullWidth, height: "100%" }}>
      {scrollDisabled ? (
        /* No scrolling */
        <List.Section>
          { extraListItems }
          {listData.map((group, idx) => group.items.length > 0 && (
            <List.Accordion
              key={idx}
              title={group.title}
              expanded={expandedAccordions[idx]}
              onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
              style={{ backgroundColor: Colors.secondaryBackground }}
              titleStyle={{ color: Colors.quinaryColor }}
            >
              {group.items.map((item, index) => {
                const isCmmWithBadge = showChangeBadges && group.key === VERUSID_CMM_INFO.key && item.changeType;
                if (isCmmWithBadge) {
                  return (
                    <React.Fragment key={index}>
                      {renderCmmCard(item, displayUpdates[group.key][item.key])}
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={index}>
                    <List.Item
                      title={
                        displayUpdates[group.key][item.key]
                          ? `${item.dataInDescription ? item.title : displayUpdates[group.key][item.key].data}`
                          : item.dataInDescription ? item.title : item.data
                      }
                      titleStyle={
                        displayUpdates[group.key][item.key]
                          ? { color: 'green' }
                          : {}
                      }
                      titleNumberOfLines={100}
                      description={() =>
                        displayUpdates[group.key][item.key] ? (
                          <>
                            {
                              item.data != null && !item.hideOldData && 
                              (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                            }
                            <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? displayUpdates[group.key][item.key].data : item.title}</Text>
                          </>
                        ) : (
                          <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                        )
                      }
                      onPress={
                        displayUpdates[group.key][item.key] && 
                        displayUpdates[group.key][item.key].onPress ? 
                          displayUpdates[group.key][item.key].onPress 
                          : 
                          item.onPress
                      }
                    />
                    <Divider />
                  </React.Fragment>
                )
              })}
            </List.Accordion>
          ))}
        </List.Section>
      ) : (
        /* Enable scrolling */
        <ScrollView>
          <List.Section>
            { extraListItems }
            {listData.map((group, idx) => group.items.length > 0 && (
              <List.Accordion
                key={idx}
                title={group.title}
                expanded={expandedAccordions[idx]}
                onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
                style={{ backgroundColor: Colors.secondaryBackground }}
                titleStyle={{ color: Colors.quinaryColor }}
              >
                {group.items.map((item, index) => {
                  const isCmmWithBadge = showChangeBadges && group.key === VERUSID_CMM_INFO.key && item.changeType;
                  if (isCmmWithBadge) {
                    return (
                      <React.Fragment key={index}>
                        {renderCmmCard(item, displayUpdates[group.key][item.key])}
                      </React.Fragment>
                    );
                  }
                  return (
                    <React.Fragment key={index}>
                      <List.Item
                        title={
                          displayUpdates[group.key][item.key]
                            ? `${item.dataInDescription ? item.title : displayUpdates[group.key][item.key].data}`
                            : item.dataInDescription ? item.title : item.data
                        }
                        titleStyle={
                          displayUpdates[group.key][item.key]
                            ? { color: 'green' }
                            : {}
                        }
                        titleNumberOfLines={100}
                        description={() =>
                          displayUpdates[group.key][item.key] ? (
                            <>
                              {
                                item.data != null && !item.hideOldData && 
                                (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                              }
                              <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                            </>
                          ) : (
                            <Text style={{ color: Colors.verusDarkGray }}>{item.dataInDescription ? item.data : item.title}</Text>
                          )
                        }
                        onPress={
                          displayUpdates[group.key][item.key] && 
                          displayUpdates[group.key][item.key].onPress ? 
                            displayUpdates[group.key][item.key].onPress 
                            : 
                            item.onPress
                        }
                      />
                      <Divider />
                    </React.Fragment>
                  );
                })}
              </List.Accordion>
            ))}
          </List.Section>
        </ScrollView>
      )}
      {StickyFooterComponent != null ? StickyFooterComponent : null}
    </View>
  );
}
