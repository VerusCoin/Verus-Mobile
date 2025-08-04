import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Card, Title, Text, Divider, List } from 'react-native-paper';
import styles from '../../styles';
import Colors from '../../globals/colors';
import { VdxfUniValueModalInnerAreaRender } from './VdxfUniValueModalInnerArea.render';
import MissingInfoRedirect from '../MissingInfoRedirect/MissingInfoRedirect';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const TopTabs = createMaterialTopTabNavigator();

const PartialSignDataModal = (props, navigator) => {
  /**
   * @type {import('verus-typescript-primitives').PartialSignData}
   */
  const data = props.data;
  const dataJson = data.toCLIJson();

  const [dataSectionExpanded, setDataSectionExpanded] = useState(true);
  const [additionalSectionExpanded, setAdditionalSectionExpanded] = useState(true);

  const renderField = (label, value) => {
    if (value === undefined || value === null) return null;
    return (
      <List.Item
        title={String(value)}
        description={label}
        titleNumberOfLines={5}
        descriptionNumberOfLines={1}
      />
    );
  };

  /**
   * @param {import('verus-typescript-primitives').VdxfUniValueJson} vdxfObj 
   */
  const renderVdxfUniValue = (vdxfObj) => {
    if (vdxfObj.message) return renderField('Message', vdxfObj.message)
    else if (vdxfObj.serializedbase64) return renderField('Serialized VDXF Object (base64)', vdxfObj.serializedbase64)
    else if (vdxfObj.serializedhex) return renderField('Serialized VDXF Object (hex)', vdxfObj.serializedhex)
    else {
      const key = Object.keys(vdxfObj)[0];

      return VdxfUniValueModalInnerAreaRender({
        ...props,
        objects: [{ key, data: vdxfObj[key] }]
      }, navigator);
    }
  }

  const renderDataSection = () => {
    if (data.isVdxfData()) {
      return renderVdxfUniValue(dataJson.vdxfdata);
    } else if (data.isMMRData()) {
      const renderedItems = [];

      if (dataJson.mmrsalt) {
        for (let i = 0; i < dataJson.mmrsalt.length; i++) {
          renderedItems.push(renderField(`Salt ${i + 1}`, dataJson.mmrsalt[i]));
        }
      }

      if (dataJson.mmrhashtype) {
        renderedItems.push(renderField('MMR Hash Type', dataJson.mmrhashtype));
      }

      if (dataJson.mmrdata) {
        for (let i = 0; i < dataJson.mmrdata.length; i++) {
          const x = dataJson.mmrdata[i];

          if (typeof x === 'string') renderedItems.push(renderField('String Data', x))
          else {
            if (x.filename) {
              renderedItems.push(renderField('Filename', x.filename));
            } else if (x.message) {
              renderedItems.push(renderField('Message', x.message));
            } else if (x.serializedhex) {
              renderedItems.push(renderField('Hex', x.serializedhex));
            } else if (x.serializedbase64) {
              renderedItems.push(renderField('Base64', x.serializedbase64));
            } else if (x.datahash) {
              renderedItems.push(renderField('Data Hash', x.datahash));
            } else if (x.vdxfdata) {
              renderedItems.push(renderVdxfUniValue(x.vdxfdata));
            }
          }
        }
      }

      return <>{renderedItems}</>;
    } else {
      if (dataJson.filename) {
        return renderField('Filename', dataJson.filename);
      } else if (dataJson.message) {
        return renderField('Message', dataJson.message);
      } else if (dataJson.messagehex) {
        return renderField('Hex', dataJson.messagehex);
      } else if (dataJson.messagebase64) {
        return renderField('Base64', dataJson.messagebase64);
      } else if (dataJson.datahash) {
        return renderField('Data Hash', dataJson.datahash);
      }
    }

    return (
      <MissingInfoRedirect
        icon={'alert-circle-outline'}
        label={"Something went wrong"}
      />
    );
  };

  return (
    <navigator.Screen
      name="PartialSignDataInner"
    >
      {(!data || typeof data !== 'object') ?
        () => <MissingInfoRedirect
          icon={'alert-circle-outline'}
          label={"No data provided"}
        />
        : () => <View style={{ ...styles.centerContainer, backgroundColor: Colors.secondaryColor }}>
          <ScrollView style={{ maxHeight: '90%', width: '100%' }} showsVerticalScrollIndicator>
            <List.Accordion
              title={"Data"}
              expanded={dataSectionExpanded}
              onPress={() => setDataSectionExpanded(!dataSectionExpanded)}
            >
              {renderDataSection()}
            </List.Accordion>
            <List.Accordion
              title={"Additional Info"}
              expanded={additionalSectionExpanded}
              onPress={() => setAdditionalSectionExpanded(!additionalSectionExpanded)}
            >
              {renderField('Flags', dataJson.flags)}
              {renderField('Address', dataJson.address)}
              {renderField('Prefix String', dataJson.prefixstring)}
              {renderField('Hash Type', dataJson.hashtype)}
              {renderField('Address to Encrypt To', dataJson.encrypttoaddress)}
              {renderField('Signature', dataJson.signature)}
              {renderField('Create MMR', dataJson.createmmr?.toString())}
              {Array.isArray(dataJson.vdxfkeys) && renderField('VDXF Keys', dataJson.vdxfkeys.join(', '))}
              {Array.isArray(dataJson.vdxfkeynames) && renderField('VDXF Key Names', dataJson.vdxfkeynames.join(', '))}
              {Array.isArray(dataJson.boundhashes) && renderField('Bound Hashes', dataJson.boundhashes.join(', '))}
            </List.Accordion>
          </ScrollView>
        </View>}
    </navigator.Screen>
  );
};

export default PartialSignDataModal;