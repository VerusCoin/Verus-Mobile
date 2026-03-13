/*
  VdxfUniValueModalInnerArea.render 
  - Routes VDXF payloads to the correct modal renderer.
  - Adds dedicated detail content for current identity removal actions.
*/
import React from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { ContentMultiMapRemoveKey, DataByteVectorKey, DataCurrencyMapKey, DataDescriptorKey, DataRatingsKey, DataStringKey, DataTransferDestinationKey } from "verus-typescript-primitives";
import DataStringKeyModal from "./DataStringKeyModal/DataStringKeyModal";
import CurrencyValueMapModal from "./CurrencyValueMapModal/CurrencyValueMapModal";
import ByteVectorKeyModal from "./ByteVectorKeyModal/ByteVectorKeyModal";
import RatingModal from "./RatingModal/RatingModal";
import TransferDestinationModal from "./TransferDestinationModal/TransferDestinationModal";
import DataDescriptorModal from "./DataDescriptorModal/DataDescriptorModal";
import MissingInfoRedirect from "../MissingInfoRedirect/MissingInfoRedirect";
import { vdxfUniValueModalInnerAreaStyles as localStyles } from "../../styles";

const RemoveActionSection = ({ title, body }) => {
  if (!body) return null;

  return (
    <View style={localStyles.section}>
      <Text style={localStyles.sectionTitle}>{title}</Text>
      <Text style={localStyles.sectionBody}>{body}</Text>
    </View>
  );
};

const ContentMultiMapRemoveModal = props => {
  const meta = props.item?.meta;

  // keep remove-action details explicit about current-state visibility and history.
  return (
    <ScrollView style={localStyles.root} contentContainerStyle={localStyles.content}>
      <RemoveActionSection
        title="What this changes"
        body={meta?.detailBody || 'This request changes the current content published by your identity.'}
      />
      <RemoveActionSection title="What apps will see" body={meta?.effectNote} />
      <RemoveActionSection title="Current state" body={meta?.emptyStateNote} />
      <RemoveActionSection title="Metadata note" body={meta?.metadataNote} />
      <RemoveActionSection title="Matching values" body={meta?.valueHashNote} />
      <RemoveActionSection
        title="What stays public"
        body={meta?.historyNote || 'Earlier on-chain versions may still be publicly retrievable.'}
      />
    </ScrollView>
  );
};

export const VdxfUniValueInnerAreaContentMap = new Map(
  [
    [DataStringKey.vdxfid, DataStringKeyModal],
    [DataCurrencyMapKey.vdxfid, CurrencyValueMapModal],
    [DataByteVectorKey.vdxfid, ByteVectorKeyModal],
    [DataRatingsKey.vdxfid, RatingModal],
    [DataTransferDestinationKey.vdxfid, TransferDestinationModal],
    [DataDescriptorKey.vdxfid, DataDescriptorModal],
    [ContentMultiMapRemoveKey.vdxfid, ContentMultiMapRemoveModal]
  ]
)

export const VdxfUniValueModalInnerAreaContentRender = (props) => {
  const starterProps = {
    setLoading: props.setLoading,
    setPreventExit: props.setPreventExit,
    setVisible: props.setVisible
  };

  if (props.objects && props.objects.length > 0) {
    return props.objects.map((x) => {
      if (VdxfUniValueInnerAreaContentMap.has(x.key)) {
        const Content = VdxfUniValueInnerAreaContentMap.get(x.key);

        return (extraProps) => (
          <Content {...props} {...starterProps} {...extraProps} data={x.data} item={x} />
        );
      }

      return () => (
        <MissingInfoRedirect
          icon={'alert-circle-outline'}
          label={"Unable to display data"}
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
    )
  ];
};

export const VdxfUniValueModalInnerAreaRender = (props, navigator) => {
  const components = VdxfUniValueModalInnerAreaContentRender(props);

  return components.map((Content, index) => {
    const key = `inner_area_${index}`;

    return <navigator.Screen
      name={key}
      key={key}
      options={{
        tabBarLabel: `${index + 1}`
      }}
    >
      {navProps => <Content {...navProps} />}
    </navigator.Screen>
  })
};
