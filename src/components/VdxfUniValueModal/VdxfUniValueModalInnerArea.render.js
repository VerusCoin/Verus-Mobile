// VdxfUniValueModal.render.js (Refactored for Hooks)
import React from "react";
import { DataByteVectorKey, DataCurrencyMapKey, DataDescriptorKey, DataRatingsKey, DataStringKey, DataTransferDestinationKey } from "verus-typescript-primitives";
import DataStringKeyModal from "./DataStringKeyModal/DataStringKeyModal";
import CurrencyValueMapModal from "./CurrencyValueMapModal/CurrencyValueMapModal";
import ByteVectorKeyModal from "./ByteVectorKeyModal/ByteVectorKeyModal";
import RatingModal from "./RatingModal/RatingModal";
import TransferDestinationModal from "./TransferDestinationModal/TransferDestinationModal";
import DataDescriptorModal from "./DataDescriptorModal/DataDescriptorModal";
import MissingInfoRedirect from "../MissingInfoRedirect/MissingInfoRedirect";

export const VdxfUniValueInnerAreaContentMap = new Map(
  [
    [DataStringKey.vdxfid, DataStringKeyModal],
    [DataCurrencyMapKey.vdxfid, CurrencyValueMapModal],
    [DataByteVectorKey.vdxfid, ByteVectorKeyModal],
    [DataRatingsKey.vdxfid, RatingModal],
    [DataTransferDestinationKey.vdxfid, TransferDestinationModal],
    [DataDescriptorKey.vdxfid, DataDescriptorModal]
  ]
)

export const VdxfUniValueModalInnerAreaContentRender = (props) => {
  const starterProps = {
    setLoading: props.setLoading,
    setPreventExit: props.setPreventExit,
    setVisible: props.setVisible
  };

  return props.objects && props.objects.length > 0 ? props.objects.map((x, index) => {
    if (VdxfUniValueInnerAreaContentMap.has(x.key)) {
      const Content = VdxfUniValueInnerAreaContentMap.get(x.key);

      return <Content {...props} {...starterProps} data={x.data} />
    } else return <MissingInfoRedirect
      icon={'alert-circle-outline'}
      label={"Unable to display data"}
    />
  }) : <MissingInfoRedirect
    icon={'alert-circle-outline'}
    label={"No data"}
  />
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