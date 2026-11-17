package com.verusmobile;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.TextPaint;
import android.view.View;

public class PrivacyBlurredTextView extends View {
  private static final float BLUR_SIGMA_SCALE = 0.57735f;
  private static final float BLUR_SIGMA_OFFSET = 0.5f;

  private final TextPaint paint = new TextPaint(TextPaint.ANTI_ALIAS_FLAG);
  private final Paint placeholderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private String text = "";
  private String fontFamily;
  private String fontWeight = "normal";
  private String textAlign = "left";
  private float fontSize = 14;
  private float lineHeight = 14;
  private float letterSpacing = 0;
  private float blurRadius = 5;
  private Bitmap blurredBitmap;
  private int bitmapPadding;
  private boolean blurUnavailable;

  public PrivacyBlurredTextView(Context context) {
    super(context);
    paint.setColor(Color.BLACK);
    placeholderPaint.setColor(Color.BLACK);
    setWillNotDraw(false);
  }

  public void setText(String value) {
    text = value == null ? "" : value;
    invalidateBlur();
  }

  public void setTextColor(int value) {
    paint.setColor(value);
    placeholderPaint.setColor(value | 0xff000000);
    invalidateBlur();
  }

  public void setFontFamily(String value) {
    fontFamily = value;
    updateTypeface();
  }

  public void setFontWeight(String value) {
    fontWeight = value == null ? "normal" : value;
    updateTypeface();
  }

  public void setFontSize(float value) {
    fontSize = value;
    paint.setTextSize(toPixels(value));
    updateLetterSpacing();
    invalidateBlur();
  }

  public void setLetterSpacing(float value) {
    letterSpacing = value;
    updateLetterSpacing();
    invalidateBlur();
  }

  public void setLineHeight(float value) {
    lineHeight = value;
    invalidateBlur();
  }

  public void setTextAlign(String value) {
    textAlign = value == null ? "left" : value;
    invalidateBlur();
  }

  public void setBlurRadius(float value) {
    blurRadius = value;
    invalidateBlur();
  }

  private float toPixels(float value) {
    return value * getResources().getDisplayMetrics().density;
  }

  private void updateTypeface() {
    int style = "bold".equals(fontWeight) || parseWeight(fontWeight) >= 600
        ? Typeface.BOLD
        : Typeface.NORMAL;
    paint.setTypeface(Typeface.create(fontFamily, style));
    invalidateBlur();
  }

  private void updateLetterSpacing() {
    paint.setLetterSpacing(fontSize == 0 ? 0 : letterSpacing / fontSize);
  }

  private int parseWeight(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException ignored) {
      return 400;
    }
  }

  private void invalidateBlur() {
    if (blurredBitmap != null) {
      blurredBitmap.recycle();
      blurredBitmap = null;
    }
    blurUnavailable = false;
    invalidate();
  }

  @Override
  protected void onSizeChanged(int width, int height, int oldWidth, int oldHeight) {
    super.onSizeChanged(width, height, oldWidth, oldHeight);
    invalidateBlur();
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);

    if (text.isEmpty() || getWidth() == 0 || getHeight() == 0) {
      return;
    }

    if (blurredBitmap == null && !blurUnavailable) {
      try {
        blurredBitmap = renderSoftwareBlur();
      } catch (RuntimeException | OutOfMemoryError ignored) {
        // Privacy must not depend on the device being able to allocate or blur a bitmap.
        blurUnavailable = true;
      }
    }
    if (blurredBitmap != null) {
      canvas.drawBitmap(blurredBitmap, -bitmapPadding, -bitmapPadding, null);
    } else {
      float radius = Math.min(toPixels(4), getHeight() / 2f);
      canvas.drawRoundRect(0, 0, getWidth(), getHeight(), radius, radius, placeholderPaint);
    }
  }

  private void drawText(Canvas canvas) {
    paint.setTextAlign(resolvePaintAlignment());
    float x = resolveTextX();
    float lineHeightPixels = toPixels(lineHeight);
    float lineTop = (getHeight() - lineHeightPixels) / 2f;
    float baseline =
        lineTop + (lineHeightPixels - paint.descent() - paint.ascent()) / 2f;
    canvas.drawText(text, x, baseline, paint);
  }

  private TextPaint.Align resolvePaintAlignment() {
    if ("right".equals(textAlign)) {
      return TextPaint.Align.RIGHT;
    }
    if ("center".equals(textAlign)) {
      return TextPaint.Align.CENTER;
    }
    return TextPaint.Align.LEFT;
  }

  private float resolveTextX() {
    if ("right".equals(textAlign)) {
      return getWidth();
    }
    if ("center".equals(textAlign)) {
      return getWidth() / 2f;
    }
    return 0;
  }

  private Bitmap renderSoftwareBlur() {
    // RN's BaseViewManager clears a View's RenderEffect after every prop update.
    // Blur into a software bitmap instead; never draw clear text to the display canvas.
    float sigma = toPixels(blurRadius);
    if (!(sigma > 0) || Float.isInfinite(sigma)) {
      throw new IllegalArgumentException("A privacy blur needs a finite, positive radius");
    }
    float radius = Math.max((sigma - BLUR_SIGMA_OFFSET) / BLUR_SIGMA_SCALE, 0.1f);
    bitmapPadding = (int) Math.ceil(sigma * 3);
    Bitmap bitmap = Bitmap.createBitmap(
        getWidth() + bitmapPadding * 2,
        getHeight() + bitmapPadding * 2,
        Bitmap.Config.ARGB_8888);
    try {
      Canvas bitmapCanvas = new Canvas(bitmap);
      bitmapCanvas.translate(bitmapPadding, bitmapPadding);
      paint.setMaskFilter(new BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL));
      drawText(bitmapCanvas);
      return bitmap;
    } catch (RuntimeException | OutOfMemoryError error) {
      bitmap.recycle();
      throw error;
    } finally {
      paint.setMaskFilter(null);
    }
  }
}
