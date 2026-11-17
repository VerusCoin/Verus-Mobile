package com.verusmobile;

import androidx.annotation.NonNull;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class PrivacyBlurredTextViewManager
    extends SimpleViewManager<PrivacyBlurredTextView> {
  public static final String REACT_CLASS = "PrivacyBlurredText";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected PrivacyBlurredTextView createViewInstance(
      @NonNull ThemedReactContext reactContext) {
    return new PrivacyBlurredTextView(reactContext);
  }

  @ReactProp(name = "text")
  public void setText(PrivacyBlurredTextView view, String value) {
    view.setText(value);
  }

  @ReactProp(name = "color", customType = "Color")
  public void setColor(PrivacyBlurredTextView view, int value) {
    view.setTextColor(value);
  }

  @ReactProp(name = "fontFamily")
  public void setFontFamily(PrivacyBlurredTextView view, String value) {
    view.setFontFamily(value);
  }

  @ReactProp(name = "fontWeight")
  public void setFontWeight(PrivacyBlurredTextView view, String value) {
    view.setFontWeight(value);
  }

  @ReactProp(name = "fontSize", defaultFloat = 14)
  public void setFontSize(PrivacyBlurredTextView view, float value) {
    view.setFontSize(value);
  }

  @ReactProp(name = "letterSpacing", defaultFloat = 0)
  public void setLetterSpacing(PrivacyBlurredTextView view, float value) {
    view.setLetterSpacing(value);
  }

  @ReactProp(name = "lineHeight", defaultFloat = 14)
  public void setLineHeight(PrivacyBlurredTextView view, float value) {
    view.setLineHeight(value);
  }

  @ReactProp(name = "textAlign")
  public void setTextAlign(PrivacyBlurredTextView view, String value) {
    view.setTextAlign(value);
  }

  @ReactProp(name = "blurRadius", defaultFloat = 5)
  public void setBlurRadius(PrivacyBlurredTextView view, float value) {
    view.setBlurRadius(value);
  }
}
