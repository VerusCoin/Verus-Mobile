/*
  VdxfUniValueModalInnerArea.render
  - Routes inspector items to structured renderers when recognized.
  - Falls back to a raw, copyable viewer instead of a dead-end error state.
  - Unifies generic VDXF values, remove actions, and partial sign data.
*/
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { List, Text } from "react-native-paper";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  ContentMultiMapRemoveKey,
  DataByteVectorKey,
  DataCurrencyMapKey,
  DataDescriptorKey,
  DataRatingsKey,
  DataStringKey,
  DataTransferDestinationKey,
} from "verus-typescript-primitives";
import DataStringKeyModal from "./DataStringKeyModal/DataStringKeyModal";
import CurrencyValueMapModal from "./CurrencyValueMapModal/CurrencyValueMapModal";
import ByteVectorKeyModal from "./ByteVectorKeyModal/ByteVectorKeyModal";
import RatingModal from "./RatingModal/RatingModal";
import TransferDestinationModal from "./TransferDestinationModal/TransferDestinationModal";
import DataDescriptorModal from "./DataDescriptorModal/DataDescriptorModal";
import MissingInfoRedirect from "../MissingInfoRedirect/MissingInfoRedirect";
import { copyToClipboard } from "../../utils/clipboard/clipboard";
import { getVDXFKeyLabel } from "../../utils/vdxf/vdxfTypeLabels";
import { vdxfUniValueModalInnerAreaStyles as localStyles } from "../../styles";
import Colors from "../../globals/colors";

const COPY_FEEDBACK_MS = 1500;

const RemoveActionSection = ({ title, body }) => {
  if (!body) return null;

  return (
    <View style={localStyles.section}>
      <Text style={localStyles.sectionTitle}>{title}</Text>
      <Text style={localStyles.sectionBody}>{body}</Text>
    </View>
  );
};

const formatInspectorRawValue = value => {
  if (value == null) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return String(value);
  }
};

const copyInspectorValue = (value, label = 'Data') => {
  const rawText = formatInspectorRawValue(value);
  if (!rawText) return;

  copyToClipboard(rawText);
};

const useCopyFeedback = () => {
  const [copiedKey, setCopiedKey] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerCopied = key => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCopiedKey(key);
    timeoutRef.current = setTimeout(() => {
      setCopiedKey(null);
    }, COPY_FEEDBACK_MS);
  };

  return { copiedKey, triggerCopied };
};

const InspectorToolbar = ({
  copyValue,
  copyLabel,
  copiedLabel,
  copiedKey,
  onCopy,
}) => {
  if (copyValue == null || formatInspectorRawValue(copyValue) === '') {
    return null;
  }

  const isCopied = copiedKey === 'toolbar';

  return (
    <View style={localStyles.toolbar}>
      <TouchableOpacity
        onPress={() => onCopy('toolbar', copyValue)}
        activeOpacity={0.75}
        style={localStyles.copyButton}
      >
        <MaterialCommunityIcons
          name={isCopied ? "check" : "content-copy"}
          size={16}
          color={isCopied ? Colors.verusGreenColor : localStyles.copyButtonText.color}
          style={localStyles.copyButtonIcon}
        />
        <Text
          style={[
            localStyles.copyButtonText,
            isCopied && { color: Colors.verusGreenColor },
          ]}
        >
          {isCopied ? copiedLabel : copyLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const CopyableField = ({ label, value, copyStateKey, copiedKey, onCopy }) => {
  if (value === undefined || value === null) return null;

  const displayValue =
    typeof value === 'object' ? formatInspectorRawValue(value) : String(value);
  const isCopied = copiedKey === copyStateKey;

  return (
    <List.Item
      title={displayValue}
      description={label}
      titleNumberOfLines={5}
      descriptionNumberOfLines={1}
      onPress={() => onCopy(copyStateKey, displayValue)}
      right={props => (
        <MaterialCommunityIcons
          {...props}
          name={isCopied ? "check" : "content-copy"}
          size={18}
          color={isCopied ? Colors.verusGreenColor : "#8A94A6"}
          style={localStyles.fieldCopyIcon}
        />
      )}
    />
  );
};

const ContentMultiMapRemoveModal = props => {
  const meta = props.item?.meta;

  return (
    <ScrollView style={localStyles.root} contentContainerStyle={localStyles.content}>
      <RemoveActionSection
        title="What this changes"
        body={
          meta?.detailBody ||
          'This request changes the current content published by your identity.'
        }
      />
      <RemoveActionSection title="What apps will see" body={meta?.effectNote} />
      <RemoveActionSection title="Current state" body={meta?.emptyStateNote} />
      <RemoveActionSection title="Metadata note" body={meta?.metadataNote} />
      <RemoveActionSection title="Matching values" body={meta?.valueHashNote} />
      <RemoveActionSection
        title="What stays public"
        body={
          meta?.historyNote ||
          'Earlier on-chain versions may still be publicly retrievable.'
        }
      />
    </ScrollView>
  );
};

const RawInspectorContent = ({ item }) => {
  const rawText = formatInspectorRawValue(item.rawData ?? item.data);
  const typeLabel =
    item.key && !String(item.key).startsWith('raw:')
      ? getVDXFKeyLabel(item.key) || item.key
      : null;

  return (
    <ScrollView style={localStyles.root} contentContainerStyle={localStyles.content}>
      {typeLabel && (
        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Type</Text>
          <Text style={localStyles.sectionBody}>{typeLabel}</Text>
        </View>
      )}
      <View style={localStyles.section}>
        <Text style={localStyles.sectionTitle}>Raw data</Text>
        <Text selectable style={localStyles.rawDataText}>
          {rawText || 'No raw data available.'}
        </Text>
      </View>
    </ScrollView>
  );
};

const SignDataInspectorContent = ({ item }) => {
  const data = item.data;
  const dataJson =
    data && typeof data.toCLIJson === 'function' ? data.toCLIJson() : null;
  const [dataSectionExpanded, setDataSectionExpanded] = useState(true);
  const [additionalSectionExpanded, setAdditionalSectionExpanded] =
    useState(true);
  const { copiedKey, triggerCopied } = useCopyFeedback();

  if (!dataJson) {
    return <RawInspectorContent item={item} />;
  }

  const handleCopy = (key, value) => {
    copyInspectorValue(value, key);
    triggerCopied(key);
  };

  const renderVdxfUniValue = vdxfObj => {
    if (!vdxfObj || typeof vdxfObj !== 'object') {
      return (
        <CopyableField
          label="Data"
          value={vdxfObj}
          copyStateKey="data"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }

    if (vdxfObj.message) {
      return (
        <CopyableField
          label="Message"
          value={vdxfObj.message}
          copyStateKey="message"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (vdxfObj.serializedbase64) {
      return (
        <CopyableField
          label="Serialized VDXF Object (base64)"
          value={vdxfObj.serializedbase64}
          copyStateKey="serializedbase64"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (vdxfObj.serializedhex) {
      return (
        <CopyableField
          label="Serialized VDXF Object (hex)"
          value={vdxfObj.serializedhex}
          copyStateKey="serializedhex"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }

    const key = Object.keys(vdxfObj)[0];
    const keyLabel = key ? getVDXFKeyLabel(key) || key : 'VDXF data';
    const value = key ? vdxfObj[key] : vdxfObj;

    return (
      <CopyableField
        label={keyLabel}
        value={value}
        copyStateKey={key || 'vdxf-data'}
        copiedKey={copiedKey}
        onCopy={handleCopy}
      />
    );
  };

  const renderDataSection = () => {
    if (data.isVdxfData()) {
      return renderVdxfUniValue(dataJson.vdxfdata);
    }

    if (data.isMMRData()) {
      const renderedItems = [];

      if (dataJson.mmrsalt) {
        for (let i = 0; i < dataJson.mmrsalt.length; i++) {
          renderedItems.push(
            <CopyableField
              key={`salt-${i}`}
              label={`Salt ${i + 1}`}
              value={dataJson.mmrsalt[i]}
              copyStateKey={`salt-${i}`}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />,
          );
        }
      }

      if (dataJson.mmrhashtype) {
        renderedItems.push(
          <CopyableField
            key="mmr-hash-type"
            label="MMR Hash Type"
            value={dataJson.mmrhashtype}
            copyStateKey="mmr-hash-type"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />,
        );
      }

      if (dataJson.mmrdata) {
        for (let i = 0; i < dataJson.mmrdata.length; i++) {
          const value = dataJson.mmrdata[i];
          const keyPrefix = `mmr-data-${i}`;

          if (typeof value === 'string') {
            renderedItems.push(
              <CopyableField
                key={keyPrefix}
                label="String Data"
                value={value}
                copyStateKey={keyPrefix}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
            continue;
          }

          if (value.filename) {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-filename`}
                label="Filename"
                value={value.filename}
                copyStateKey={`${keyPrefix}-filename`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          } else if (value.message) {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-message`}
                label="Message"
                value={value.message}
                copyStateKey={`${keyPrefix}-message`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          } else if (value.serializedhex) {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-hex`}
                label="Hex"
                value={value.serializedhex}
                copyStateKey={`${keyPrefix}-hex`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          } else if (value.serializedbase64) {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-base64`}
                label="Base64"
                value={value.serializedbase64}
                copyStateKey={`${keyPrefix}-base64`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          } else if (value.datahash) {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-hash`}
                label="Data Hash"
                value={value.datahash}
                copyStateKey={`${keyPrefix}-hash`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          } else if (value.vdxfdata) {
            renderedItems.push(
              <View key={`${keyPrefix}-vdxf`}>
                {renderVdxfUniValue(value.vdxfdata)}
              </View>,
            );
          } else {
            renderedItems.push(
              <CopyableField
                key={`${keyPrefix}-raw`}
                label="MMR Data"
                value={value}
                copyStateKey={`${keyPrefix}-raw`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />,
            );
          }
        }
      }

      return renderedItems;
    }

    if (dataJson.filename) {
      return (
        <CopyableField
          label="Filename"
          value={dataJson.filename}
          copyStateKey="filename"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (dataJson.message) {
      return (
        <CopyableField
          label="Message"
          value={dataJson.message}
          copyStateKey="message"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (dataJson.messagehex) {
      return (
        <CopyableField
          label="Hex"
          value={dataJson.messagehex}
          copyStateKey="messagehex"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (dataJson.messagebase64) {
      return (
        <CopyableField
          label="Base64"
          value={dataJson.messagebase64}
          copyStateKey="messagebase64"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }
    if (dataJson.datahash) {
      return (
        <CopyableField
          label="Data Hash"
          value={dataJson.datahash}
          copyStateKey="datahash"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      );
    }

    return (
      <RawInspectorContent
        item={{ ...item, rawData: dataJson }}
      />
    );
  };

  return (
    <View style={localStyles.root}>
      <ScrollView
        style={localStyles.root}
        contentContainerStyle={localStyles.signDataContent}
        showsVerticalScrollIndicator
      >
        <List.Accordion
          title="Data"
          expanded={dataSectionExpanded}
          onPress={() => setDataSectionExpanded(!dataSectionExpanded)}
        >
          {renderDataSection()}
        </List.Accordion>
        <List.Accordion
          title="Additional Info"
          expanded={additionalSectionExpanded}
          onPress={() =>
            setAdditionalSectionExpanded(!additionalSectionExpanded)
          }
        >
          <CopyableField
            label="Flags"
            value={dataJson.flags}
            copyStateKey="flags"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Address"
            value={dataJson.address}
            copyStateKey="address"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Prefix String"
            value={dataJson.prefixstring}
            copyStateKey="prefixstring"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Hash Type"
            value={dataJson.hashtype}
            copyStateKey="hashtype"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Address to Encrypt To"
            value={dataJson.encrypttoaddress}
            copyStateKey="encrypttoaddress"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Signature"
            value={dataJson.signature}
            copyStateKey="signature"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Create MMR"
            value={dataJson.createmmr?.toString()}
            copyStateKey="createmmr"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="VDXF Keys"
            value={
              Array.isArray(dataJson.vdxfkeys)
                ? dataJson.vdxfkeys.join(', ')
                : null
            }
            copyStateKey="vdxfkeys"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="VDXF Key Names"
            value={
              Array.isArray(dataJson.vdxfkeynames)
                ? dataJson.vdxfkeynames.join(', ')
                : null
            }
            copyStateKey="vdxfkeynames"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <CopyableField
            label="Bound Hashes"
            value={
              Array.isArray(dataJson.boundhashes)
                ? dataJson.boundhashes.join(', ')
                : null
            }
            copyStateKey="boundhashes"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        </List.Accordion>
      </ScrollView>
    </View>
  );
};

export const VdxfUniValueInnerAreaContentMap = new Map([
  [DataStringKey.vdxfid, DataStringKeyModal],
  [DataCurrencyMapKey.vdxfid, CurrencyValueMapModal],
  [DataByteVectorKey.vdxfid, ByteVectorKeyModal],
  [DataRatingsKey.vdxfid, RatingModal],
  [DataTransferDestinationKey.vdxfid, TransferDestinationModal],
  [DataDescriptorKey.vdxfid, DataDescriptorModal],
  [ContentMultiMapRemoveKey.vdxfid, ContentMultiMapRemoveModal],
]);

const getLegacyInspectorItems = props => {
  if (!props.objects || props.objects.length === 0) {
    return [];
  }

  return props.objects.map((item, index) => ({
    kind: 'vdxf-value',
    rawData: item.data,
    ...item,
    key:
      item.key != null && item.key !== ''
        ? item.key
        : `raw:${index + 1}`,
  }));
};

const getStructuredInspectorElement = (props, item) => {
  if (item.kind === 'sign-data') {
    return <SignDataInspectorContent item={item} />;
  }

  if (item.key && VdxfUniValueInnerAreaContentMap.has(item.key)) {
    const Content = VdxfUniValueInnerAreaContentMap.get(item.key);
    return (
      <Content
        {...props}
        setLoading={props.setLoading}
        setPreventExit={props.setPreventExit}
        setVisible={props.setVisible}
        data={item.data}
        item={item}
      />
    );
  }

  return null;
};

const UnifiedInspectorContent = props => {
  const { item, title } = props;
  const structuredContent = getStructuredInspectorElement(props, item);
  const copyValue =
    item.rawData != null ? item.rawData : item.data != null ? item.data : null;
  const { copiedKey, triggerCopied } = useCopyFeedback();

  const handleToolbarCopy = (key, value) => {
    copyInspectorValue(value, title);
    triggerCopied(key);
  };

  return (
    <View style={localStyles.root}>
      <InspectorToolbar
        copyValue={copyValue}
        copyLabel={item.kind === 'sign-data' ? 'Copy data' : 'Copy raw data'}
        copiedLabel={item.kind === 'sign-data' ? 'Copied' : 'Copied'}
        copiedKey={copiedKey}
        onCopy={handleToolbarCopy}
      />
      <View style={localStyles.contentContainer}>
        {structuredContent || <RawInspectorContent item={item} />}
      </View>
    </View>
  );
};

export const VdxfUniValueModalInnerAreaContentRender = props => {
  const items =
    props.items && props.items.length > 0
      ? props.items
      : getLegacyInspectorItems(props);

  if (items.length > 0) {
    return items.map(item => {
      return extraProps => (
        <UnifiedInspectorContent
          {...props}
          {...extraProps}
          item={item}
        />
      );
    });
  }

  return [
    () => (
      <MissingInfoRedirect
        icon={'alert-circle-outline'}
        label={"No data"}
      />
    ),
  ];
};

export const VdxfUniValueModalInnerAreaRender = (props, navigator) => {
  const components = VdxfUniValueModalInnerAreaContentRender(props);

  return components.map((Content, index) => {
    const key = `inner_area_${index}`;

    return (
      <navigator.Screen
        name={key}
        key={key}
        options={{
          tabBarLabel: `${index + 1}`,
        }}
      >
        {navProps => <Content {...navProps} />}
      </navigator.Screen>
    );
  });
};
