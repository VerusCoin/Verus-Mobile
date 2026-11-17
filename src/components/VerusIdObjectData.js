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
  - 2026-03-06: Clarified current-content removal wording  so pre-confirmation cards use
    future tense and content-clear actions get dedicated copy.
  - 2026-09-12: Added the 'signedInDetails' presentation for the signed-in VerusID
    details screen. It puts status/network first, omits the redundant name row,
    expands control information while leaving technical sections collapsed, and
    swaps row-wide copy alerts for an inline CopyAction. Default behavior for the
    Identity Update/revoke/recover consumers is unchanged.
  - 2026-09-12: The 'signedInDetails' rows opt out of the merged List.Item
    accessibility element so the nested CopyAction stays reachable, and copied
    feedback now names the field it copied.
*/
import React, { useEffect, useState } from 'react';
import { Clipboard, Alert, View, Image, ScrollView } from 'react-native';
import { Text, List, Divider, Paragraph } from 'react-native-paper';
import Colors from '../globals/colors';
import Styles, { verusIdObjectDataStyles as LocalStyles } from '../styles';
import { Revoke, Recover, Coins } from '../images/customIcons';
import { openUrl } from "../utils/linking";
import AnimatedSuccessCheckmark from "./AnimatedSuccessCheckmark";
import CopyAction from './CopyAction';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVerusIdStatus } from '../utils/verusid/getVerusIdStatus';
import { 
  VERUSID_AUTH_INFO, 
  VERUSID_BASE_INFO, 
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
import VerusIdContentChangeCard, {
  buildVerusIdContentChangeItems,
  getCmmDataKeyLabel,
  normalizeCmmDisplayUpdates,
} from './VerusIdContentChangeCard';

const checkmark = (<AnimatedSuccessCheckmark style={{ width: 20, marginRight: 5, marginBottom: 1, alignSelf: 'flex-end', }} />);

const triangle = <MaterialCommunityIcons name={'information'} size={20} color={Colors.warningButtonColor} style={{ width: 20, marginRight: 9, alignSelf: 'flex-end', }} />;

export const VERUSID_OBJECT_DATA_PRESENTATIONS = {
  DEFAULT: 'default',
  SIGNED_IN_DETAILS: 'signedInDetails',
};

// Control information answers "who else can act on this VerusID?" and stays open.
// Identity content and the private address are technical detail and start collapsed.
const SIGNED_IN_DETAILS_EXPANDED_GROUPS = [
  VERUSID_WARNINGS.key,
  VERUSID_BASE_INFO.key,
  VERUSID_AUTH_INFO.key,
];

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
    showChangeBadges,
    semanticTheme,
    presentation = VERUSID_OBJECT_DATA_PRESENTATIONS.DEFAULT,
  } = props;

  const signedInDetailsPresentation =
    presentation === VERUSID_OBJECT_DATA_PRESENTATIONS.SIGNED_IN_DETAILS;
  
  const [listData, setListData] = useState([]);
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const isIdentityContentGroup = (group) =>
    showChangeBadges && group.key === VERUSID_CMM_INFO.key;

  const getAccordionTitle = (group) =>
    isIdentityContentGroup(group) ? 'Identity content' : group.title;

  const getAccordionStyle = (group) =>
    isIdentityContentGroup(group)
      ? LocalStyles.contentAccordion
      : {
          backgroundColor:
            semanticTheme?.colors.surfaceMuted || Colors.secondaryBackground,
        };

  const getAccordionTitleStyle = (group) =>
    isIdentityContentGroup(group)
      ? LocalStyles.contentAccordionTitle
      : {
          color: semanticTheme?.colors.textPrimary || Colors.quinaryColor,
        };

  const itemTextColor =
    semanticTheme?.colors.textPrimary || Colors.quinaryColor;
  const itemDescriptionColor =
    semanticTheme?.colors.textSecondary || Colors.verusDarkGray;
  const itemBackgroundColor = semanticTheme?.colors.surface;
  const dividerColor = semanticTheme?.colors.border;

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

    updateFrame[VERUSID_CMM_INFO.key] = normalizeCmmDisplayUpdates(
      updateFrame[VERUSID_CMM_INFO.key],
    );

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
    return getCmmDataKeyLabel(iAddr, cmmDataKeys);
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
          key: VERUSID_IADDRESS.key,
          title: VERUSID_IADDRESS.label,
          data: verusId.identity.identityaddress,
          copyValue: verusId.identity.identityaddress,
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
          copyValue: verusId.identity.systemid,
          onPress: () => copyDataToClipboard(verusId.identity.systemid, VERUSID_SYSTEM.label),
        },
      ];

      const nameRow = {
        key: VERUSID_NAME.key,
        title: VERUSID_NAME.label,
        data: verusId.identity.name,
        copyValue: verusId.identity.name,
        onPress: () => copyDataToClipboard(verusId.identity.name, VERUSID_NAME.label),
      };

      // The signed-in details screen shows the name as its title and leads with
      // status and network instead of repeating the name as a row.
      const orderedBaseInfo = signedInDetailsPresentation
        ? [baseInfo[1], baseInfo[2], baseInfo[0]]
        : [nameRow, ...baseInfo];
  
      const authorityInfo = [
        {
          key: VERUSID_REVOCATION_AUTH.key,
          title: VERUSID_REVOCATION_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.revocationauthority),
          copyValue: verusId.identity.revocationauthority,
          onPress: () => copyDataToClipboard(verusId.identity.revocationauthority, VERUSID_REVOCATION_AUTH.label),
        },
        {
          key: VERUSID_RECOVERY_AUTH.key,
          title: VERUSID_RECOVERY_AUTH.label,
          data: tryDisplayFriendlyName(verusId.identity.recoveryauthority),
          copyValue: verusId.identity.recoveryauthority,
          onPress: () => copyDataToClipboard(verusId.identity.recoveryauthority, VERUSID_RECOVERY_AUTH.label),
        },
      ];

      const privacyData = [];
      if (verusId.identity.privateaddress || (displayUpdates[VERUSID_PRIVATE_INFO.key][VERUSID_PRIVATE_ADDRESS.key])) {
        privacyData.push({
          key: VERUSID_PRIVATE_ADDRESS.key,
          title: VERUSID_PRIVATE_ADDRESS.label,
          data: verusId.identity.privateaddress || null,
          copyValue: verusId.identity.privateaddress || null,
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
          copyValue: primaryAddrs[i] || null,
          onPress: primaryAddrs[i]
            ? () => copyDataToClipboard(primaryAddrs[i], 'Primary Address')
            : undefined,
        });
      }

      primaryAddresses.sort((a, b) => b.key.localeCompare(a.key));

      const contentMultiMapInfo = buildVerusIdContentChangeItems({
        verusId,
        cmmUpdates: displayUpdates[VERUSID_CMM_INFO.key],
        getCmmDataKey,
      });
  
      // Build grouped data
      const groupedData = [
        { key: VERUSID_WARNINGS.key, title: VERUSID_WARNINGS.label, items: warningData },
        { key: VERUSID_BASE_INFO.key, title: VERUSID_BASE_INFO.label, items: orderedBaseInfo },
        { key: VERUSID_CMM_INFO.key, title: VERUSID_CMM_INFO.label, items: contentMultiMapInfo },
        { key: VERUSID_AUTH_INFO.key, title: VERUSID_AUTH_INFO.label, items: authorityInfo.concat(primaryAddresses) },
        { key: VERUSID_PRIVATE_INFO.key, title: VERUSID_PRIVATE_INFO.label, items: privacyData },
      ];

      // Authorities precede identity content on the signed-in details screen so
      // the control model reads before raw content data.
      const orderedGroups = signedInDetailsPresentation
        ? [
            groupedData[1],
            groupedData[0],
            groupedData[3],
            groupedData[2],
            groupedData[4],
          ]
        : groupedData;
  
      // Filter out unchanged if hideUnchanged is true
      const finalGroups = orderedGroups.map(group => {
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
          initialExpandedState[idx] =
            !signedInDetailsPresentation ||
            SIGNED_IN_DETAILS_EXPANDED_GROUPS.includes(group.key);
        });
        setExpandedAccordions(initialExpandedState);
      }
    }
  }, [verusId, friendlyNames, displayUpdates, cmmDataKeys, chainInfo, coinObj, hideUnchanged, hideDataOnLoad, signedInDetailsPresentation, ownedAddress, ownedByUser]);

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
              title={getAccordionTitle(group)}
              expanded={expandedAccordions[idx]}
              onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
              style={getAccordionStyle(group)}
              titleStyle={getAccordionTitleStyle(group)}
            >
              {group.items.map((item, index) => {
                const isCmmWithBadge = showChangeBadges && group.key === VERUSID_CMM_INFO.key && item.changeType;
                if (isCmmWithBadge) {
                  return (
                    <React.Fragment key={index}>
                      <VerusIdContentChangeCard
                        item={item}
                        updateEntry={displayUpdates[group.key][item.key]}
                      />
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
                          : {color: itemTextColor}
                      }
                      style={itemBackgroundColor ? {backgroundColor: itemBackgroundColor} : undefined}
                      titleNumberOfLines={100}
                      accessible={signedInDetailsPresentation ? false : undefined}
                      right={
                        signedInDetailsPresentation && item.copyValue
                          ? () => (
                              <CopyAction
                                accessibilityLabel={`Copy ${item.title}`}
                                copiedAccessibilityLabel={`${item.title} copied`}
                                value={item.copyValue}
                              />
                            )
                          : undefined
                      }
                      description={() =>
                        displayUpdates[group.key][item.key] ? (
                          <>
                            {
                              item.data != null && !item.hideOldData && 
                              (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                            }
                            <Text style={{color: itemDescriptionColor}}>{item.dataInDescription ? displayUpdates[group.key][item.key].data : item.title}</Text>
                          </>
                        ) : (
                          <Text style={{color: itemDescriptionColor}}>{item.dataInDescription ? item.data : item.title}</Text>
                        )
                      }
                      onPress={
                        signedInDetailsPresentation
                          ? undefined
                          : displayUpdates[group.key][item.key] &&
                            displayUpdates[group.key][item.key].onPress
                          ? displayUpdates[group.key][item.key].onPress
                          : item.onPress
                      }
                    />
                    <Divider style={dividerColor ? {backgroundColor: dividerColor} : undefined} />
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
                title={getAccordionTitle(group)}
                expanded={expandedAccordions[idx]}
                onPress={() => setExpandedAccordions({ ...expandedAccordions, [idx]: !expandedAccordions[idx] })}
                style={getAccordionStyle(group)}
                titleStyle={getAccordionTitleStyle(group)}
              >
                {group.items.map((item, index) => {
                  const isCmmWithBadge = showChangeBadges && group.key === VERUSID_CMM_INFO.key && item.changeType;
                  if (isCmmWithBadge) {
                    return (
                      <React.Fragment key={index}>
                        <VerusIdContentChangeCard
                          item={item}
                          updateEntry={displayUpdates[group.key][item.key]}
                        />
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
                            : {color: itemTextColor}
                        }
                        style={itemBackgroundColor ? {backgroundColor: itemBackgroundColor} : undefined}
                        titleNumberOfLines={100}
                        accessible={signedInDetailsPresentation ? false : undefined}
                        right={
                          signedInDetailsPresentation && item.copyValue
                            ? () => (
                                <CopyAction
                                  accessibilityLabel={`Copy ${item.title}`}
                                  copiedAccessibilityLabel={`${item.title} copied`}
                                  value={item.copyValue}
                                />
                              )
                            : undefined
                        }
                        description={() =>
                          displayUpdates[group.key][item.key] ? (
                            <>
                              {
                                item.data != null && !item.hideOldData && 
                                (<Text style={{ color: Colors.warningButtonColor }}>{item.dataInDescription ? item.title : item.data}</Text>)
                              }
                              <Text style={{color: itemDescriptionColor}}>{item.dataInDescription ? item.data : item.title}</Text>
                            </>
                          ) : (
                            <Text style={{color: itemDescriptionColor}}>{item.dataInDescription ? item.data : item.title}</Text>
                          )
                        }
                        onPress={
                          signedInDetailsPresentation
                            ? undefined
                            : displayUpdates[group.key][item.key] &&
                              displayUpdates[group.key][item.key].onPress
                            ? displayUpdates[group.key][item.key].onPress
                            : item.onPress
                        }
                      />
                      <Divider style={dividerColor ? {backgroundColor: dividerColor} : undefined} />
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
