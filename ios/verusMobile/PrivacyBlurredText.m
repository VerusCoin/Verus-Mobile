#import <CoreImage/CoreImage.h>
#import <React/RCTFont.h>
#import <React/RCTViewManager.h>

@interface PrivacyBlurredText : UIView

@property (nonatomic, copy) NSString *text;
@property (nonatomic, strong) UIColor *color;
@property (nonatomic, copy) NSString *fontFamily;
@property (nonatomic, copy) NSString *fontWeight;
@property (nonatomic, assign) CGFloat fontSize;
@property (nonatomic, assign) CGFloat lineHeight;
@property (nonatomic, assign) CGFloat letterSpacing;
@property (nonatomic, copy) NSString *textAlign;
@property (nonatomic, assign) CGFloat blurRadius;

@end

@implementation PrivacyBlurredText {
  UIImageView *_imageView;
  CGSize _renderedSize;
}

static CIContext *PrivacyBlurContext(void)
{
  static CIContext *context;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    context = [CIContext contextWithOptions:@{kCIContextUseSoftwareRenderer: @NO}];
  });
  return context;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.backgroundColor = UIColor.clearColor;
    self.clipsToBounds = NO;
    _imageView = [[UIImageView alloc] initWithFrame:CGRectZero];
    _imageView.backgroundColor = UIColor.clearColor;
    _imageView.userInteractionEnabled = NO;
    [self addSubview:_imageView];

    _color = UIColor.blackColor;
    _fontSize = 14;
    _lineHeight = 14;
    _letterSpacing = 0;
    _blurRadius = 5;
    _textAlign = @"left";
  }
  return self;
}

- (void)didSetProps:(__unused NSArray<NSString *> *)changedProps
{
  _renderedSize = CGSizeZero;
  [self setNeedsLayout];
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  if (CGRectIsEmpty(self.bounds) || [_text length] == 0) {
    _imageView.image = nil;
    return;
  }

  if (!CGSizeEqualToSize(_renderedSize, self.bounds.size)) {
    [self renderBlurredText];
    _renderedSize = self.bounds.size;
  }
}

- (NSTextAlignment)resolvedTextAlignment
{
  if ([_textAlign isEqualToString:@"right"]) {
    return NSTextAlignmentRight;
  }
  if ([_textAlign isEqualToString:@"center"]) {
    return NSTextAlignmentCenter;
  }
  return NSTextAlignmentLeft;
}

- (void)renderBlurredText
{
  CGFloat screenScale = UIScreen.mainScreen.scale;
  CGFloat padding = ceil(MAX(_blurRadius, 1) * 3);
  CGSize imageSize = CGSizeMake(self.bounds.size.width + padding * 2,
                                self.bounds.size.height + padding * 2);
  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
  format.opaque = NO;
  format.scale = screenScale;

  UIFont *font = [RCTFont updateFont:nil
                          withFamily:_fontFamily
                                size:@(_fontSize)
                              weight:_fontWeight
                               style:nil
                             variant:nil
                     scaleMultiplier:1];
  NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
  paragraphStyle.alignment = [self resolvedTextAlignment];
  paragraphStyle.minimumLineHeight = _lineHeight;
  paragraphStyle.maximumLineHeight = _lineHeight;

  NSDictionary *attributes = @{
    NSFontAttributeName: font,
    NSForegroundColorAttributeName: _color ?: UIColor.blackColor,
    NSKernAttributeName: @(_letterSpacing),
    NSParagraphStyleAttributeName: paragraphStyle,
  };

  UIGraphicsImageRenderer *renderer =
      [[UIGraphicsImageRenderer alloc] initWithSize:imageSize format:format];
  UIImage *source = [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
    CGRect textRect = CGRectMake(padding,
                                 padding,
                                 self.bounds.size.width,
                                 self.bounds.size.height);
    [self.text drawWithRect:textRect
                   options:NSStringDrawingUsesLineFragmentOrigin
                attributes:attributes
                   context:nil];
  }];

  CIImage *input = [[CIImage alloc] initWithCGImage:source.CGImage];
  CIFilter *filter = [CIFilter filterWithName:@"CIGaussianBlur"];
  [filter setValue:input forKey:kCIInputImageKey];
  [filter setValue:@(_blurRadius * screenScale) forKey:kCIInputRadiusKey];
  CIImage *output = filter.outputImage;
  CGImageRef cgImage = [PrivacyBlurContext() createCGImage:output fromRect:input.extent];

  if (cgImage != nil) {
    _imageView.image = [UIImage imageWithCGImage:cgImage
                                           scale:screenScale
                                     orientation:UIImageOrientationUp];
    CGImageRelease(cgImage);
  } else {
    _imageView.image = nil;
  }

  _imageView.frame = CGRectMake(-padding, -padding, imageSize.width, imageSize.height);
}

@end

@interface PrivacyBlurredTextManager : RCTViewManager
@end

@implementation PrivacyBlurredTextManager

RCT_EXPORT_MODULE(PrivacyBlurredText)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView *)view
{
  return [PrivacyBlurredText new];
}

RCT_EXPORT_VIEW_PROPERTY(text, NSString)
RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(fontFamily, NSString)
RCT_EXPORT_VIEW_PROPERTY(fontWeight, NSString)
RCT_EXPORT_VIEW_PROPERTY(fontSize, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(lineHeight, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(letterSpacing, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(textAlign, NSString)
RCT_EXPORT_VIEW_PROPERTY(blurRadius, CGFloat)

@end
