// TikTokGlass - floating liquid-glass tab bar for TikTok
#import <UIKit/UIKit.h>
#import <objc/message.h>

static const NSInteger kGlassTag = 0x61A55;

@interface UITabBar (TTGlass)
- (void)ttg_applyGlass;
@end

static UIVisualEffect *TTGEffect(void) {
    Class glassCls = NSClassFromString(@"UIGlassEffect"); // iOS 26 Liquid Glass
    if (glassCls) {
        id e = [[glassCls alloc] init];
        if ([e respondsToSelector:@selector(setInteractive:)]) {
            ((void (*)(id, SEL, BOOL))objc_msgSend)(e, @selector(setInteractive:), YES);
        }
        return e;
    }
    return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterialDark];
}

static BOOL TTGIsButton(UIView *v) {
    if ([v isKindOfClass:[UIControl class]]) return YES;
    NSString *n = NSStringFromClass([v class]);
    return [n containsString:@"Button"] || [n containsString:@"Badge"] || [n containsString:@"Item"];
}

%hook UITabBar

- (void)didMoveToWindow {
    %orig;
    if (@available(iOS 13.0, *)) {
        UITabBarAppearance *ap = [UITabBarAppearance new];
        [ap configureWithTransparentBackground];
        ap.shadowColor = UIColor.clearColor;
        self.standardAppearance = ap;
        if (@available(iOS 15.0, *)) self.scrollEdgeAppearance = ap;
    }
    self.translucent = YES;
    self.backgroundImage = [UIImage new];
    self.shadowImage = [UIImage new];
}

- (void)layoutSubviews {
    %orig;
    [self ttg_applyGlass];
}

%new
- (void)ttg_applyGlass {
    self.backgroundColor = UIColor.clearColor;
    self.clipsToBounds = NO;

    // Hide TikTok's solid background layers, keep the buttons.
    for (UIView *v in self.subviews) {
        if (v.tag == kGlassTag) continue;
        if (TTGIsButton(v)) continue;
        if ([v isKindOfClass:[UIImageView class]] || [v isKindOfClass:[UIVisualEffectView class]]) {
            v.hidden = YES;
            continue;
        }
        BOOL hasControls = NO;
        for (UIView *s in v.subviews) if (TTGIsButton(s)) { hasControls = YES; break; }
        if (!hasControls && v.subviews.count == 0) v.hidden = YES; // plain colored strip / divider
        else v.backgroundColor = UIColor.clearColor;
    }

    CGFloat bottomInset = self.window ? self.window.safeAreaInsets.bottom : 0;
    CGFloat barH = self.bounds.size.height - bottomInset;
    if (barH < 44) barH = MIN(self.bounds.size.height, 60);
    CGFloat side = 12, top = 2;
    CGRect pill = CGRectMake(side, top, self.bounds.size.width - side * 2, barH - top + (bottomInset > 0 ? 8 : -4));

    UIVisualEffectView *glass = (UIVisualEffectView *)[self viewWithTag:kGlassTag];
    if (!glass) {
        glass = [[UIVisualEffectView alloc] initWithEffect:TTGEffect()];
        glass.tag = kGlassTag;
        glass.userInteractionEnabled = NO;
        glass.clipsToBounds = YES;
        glass.layer.borderWidth = 0.6;
        glass.layer.borderColor = [UIColor colorWithWhite:1 alpha:0.18].CGColor;
        UIView *tint = [[UIView alloc] init];
        tint.backgroundColor = [UIColor colorWithWhite:1 alpha:0.06];
        tint.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [glass.contentView addSubview:tint];
        [self insertSubview:glass atIndex:0];
    } else if ([self.subviews indexOfObject:glass] != 0) {
        [self sendSubviewToBack:glass];
    }
    glass.frame = pill;
    glass.layer.cornerRadius = pill.size.height / 2;
    if (@available(iOS 13.0, *)) glass.layer.cornerCurve = kCACornerCurveContinuous;
    for (UIView *t in glass.contentView.subviews) t.frame = glass.bounds;
}

%end

// TikTok paints a black strip behind the tab bar on some screens.
%hook AWENormalModeTabBarController
- (void)viewDidLayoutSubviews {
    %orig;
    UIViewController *vc = (UIViewController *)self;
    if ([vc respondsToSelector:@selector(tabBar)]) {
        UITabBar *tb = [(id)vc tabBar];
        tb.superview.backgroundColor = UIColor.clearColor;
    }
}
%end
