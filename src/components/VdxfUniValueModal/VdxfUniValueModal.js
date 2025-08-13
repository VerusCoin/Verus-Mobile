// VdxfUniValueModal.js (Refactored with Hooks)
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { VdxfUniValueModalRender } from "./VdxfUniValueModal.render";

const VdxfUniValueModal = (props) => {
  const dispatch = useDispatch();
  const keyboard = useSelector(state => state.keyboard);
  const alertActive = useSelector(state => state.alert.active);

  const [loading, setLoadingState] = useState(false);
  const [preventExit, setPreventExitState] = useState(false);

  useEffect(() => {
    props.setVisible(!alertActive);
  }, [alertActive, dispatch]);

  const setPreventExit = useCallback(async (val) => {
    setPreventExitState(val);
  }, []);

  const setVisible = useCallback(async (visible) => {
    props.setVisible(visible);
  }, [dispatch]);

  const showHelpModal = () => {
    dispatch(createAlert("Help", ""));
  };

  const setLoading = async (val, prevent = false) => {
    setLoadingState(val);
  };

  const cancel = () => {
    if (!preventExit) {
      props.cancel()
    }
  };

  return VdxfUniValueModalRender({
    keyboard,
    alertActive,
    cancel,
    setVisible,
    visible: props.visible,
    setLoading,
    setPreventExit,
    showHelpModal,
    loading,
    preventExit,
    objects: props.objects,
    data: props.data,
    title: props.title
  });
};

export default VdxfUniValueModal;