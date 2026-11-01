// TikTokGlass - floating liquid-glass tab bar for TikTok
#import <UIKit/UIKit.h>
#import <objc/message.h>

static const NSInteger kGlassTag = 0x61A55;

#define kPrefEnabled  @"alaa_tt_glass_enabled"
#define kPrefFloating @"alaa_tt_glass_floating"
#define kPrefUnder    @"alaa_tt_video_under"
#define kPrefStyle    @"alaa_tt_glass_style"   // 0 liquid glass, 1 dark blur, 2 light blur

static NSUserDefaults *TTGDefs(void) { return NSUserDefaults.standardUserDefaults; }
static BOOL TTGEnabled(void)  { id v = [TTGDefs() objectForKey:kPrefEnabled];  return v ? [v boolValue] : YES; }
static BOOL TTGFloating(void) { id v = [TTGDefs() objectForKey:kPrefFloating]; return v ? [v boolValue] : YES; }
static BOOL TTGUnder(void)    { id v = [TTGDefs() objectForKey:kPrefUnder];    return v ? [v boolValue] : YES; }
static NSInteger TTGStyle(void) { return [TTGDefs() integerForKey:kPrefStyle]; }
static void TTGRefreshAll(void);

@interface UITabBar (TTGlass)
- (void)ttg_applyGlass;
- (void)ttg_longPress:(UILongPressGestureRecognizer *)g;
- (void)ttg_showMenu;
- (void)ttg_longPressReopen;
@end

static UIVisualEffect *TTGEffect(void) {
    NSInteger st = TTGStyle();
    if (st == 1) return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterialDark];
    if (st == 2) return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterialLight];
    Class glassCls = NSClassFromString(@"UIGlassEffect"); // iOS 26 Liquid Glass
    if (glassCls) {
        id e = [[glassCls alloc] init];
        if ([e respondsToSelector:@selector(setTintColor:)]) {
            ((void (*)(id, SEL, id))objc_msgSend)(e, @selector(setTintColor:), [UIColor colorWithWhite:0 alpha:0.35]);
        }
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
    BOOL hasLP = NO;
    for (UIGestureRecognizer *g in self.gestureRecognizers) if ([g.name isEqualToString:@"Alaa_TikTok"]) hasLP = YES;
    if (!hasLP) {
        UILongPressGestureRecognizer *lp = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(ttg_longPress:)];
        lp.name = @"Alaa_TikTok";
        lp.minimumPressDuration = 0.9;
        lp.cancelsTouchesInView = NO;
        [self addGestureRecognizer:lp];
    }
    if (!TTGEnabled()) return;
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
- (void)ttg_longPress:(UILongPressGestureRecognizer *)g {
    if (g.state != UIGestureRecognizerStateBegan) return;
    UIImpactFeedbackGenerator *hf = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleMedium];
    [hf impactOccurred];
    [self ttg_showMenu];
}

%new
- (void)ttg_showMenu {
    UIViewController *top = self.window.rootViewController;
    while (top.presentedViewController) top = top.presentedViewController;
    if (!top) return;
    NSArray *styles = @[@"Liquid Glass", @"Blur داكن", @"Blur فاتح"];
    UIAlertController *ac = [UIAlertController alertControllerWithTitle:@"Alaa_TikTok"
        message:@"إعدادات الشريط الزجاجي\n(الإطفاء الكامل بيتطبّق بعد ما تسكّر TikTok وترجع تفتحه)" preferredStyle:UIAlertControllerStyleActionSheet];
    __weak UITabBar *weakSelf = self;
    [ac addAction:[UIAlertAction actionWithTitle:(TTGEnabled() ? @"✅ الشريط الزجاجي: شغّال" : @"⬜️ الشريط الزجاجي: مطفي")
        style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
            [TTGDefs() setBool:!TTGEnabled() forKey:kPrefEnabled]; TTGRefreshAll(); [weakSelf ttg_longPressReopen]; }]];
    [ac addAction:[UIAlertAction actionWithTitle:(TTGFloating() ? @"✅ عائم مدوّر" : @"⬜️ عائم مدوّر (هلق: عرض كامل)")
        style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
            [TTGDefs() setBool:!TTGFloating() forKey:kPrefFloating]; TTGRefreshAll(); [weakSelf ttg_longPressReopen]; }]];
    [ac addAction:[UIAlertAction actionWithTitle:(TTGUnder() ? @"✅ الفيديو تحت الشريط" : @"⬜️ الفيديو تحت الشريط")
        style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
            [TTGDefs() setBool:!TTGUnder() forKey:kPrefUnder]; TTGRefreshAll(); [weakSelf ttg_longPressReopen]; }]];
    [ac addAction:[UIAlertAction actionWithTitle:[NSString stringWithFormat:@"🎨 النمط: %@", styles[MAX(0, MIN(2, TTGStyle()))]]
        style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
            [TTGDefs() setInteger:(TTGStyle() + 1) % 3 forKey:kPrefStyle];
            UIView *old = [weakSelf viewWithTag:kGlassTag]; [old removeFromSuperview];
            TTGRefreshAll(); [weakSelf ttg_longPressReopen]; }]];
    [ac addAction:[UIAlertAction actionWithTitle:@"تم" style:UIAlertActionStyleCancel handler:nil]];
    if (ac.popoverPresentationController) { ac.popoverPresentationController.sourceView = self; ac.popoverPresentationController.sourceRect = self.bounds; }
    [top presentViewController:ac animated:YES completion:nil];
}

%new
- (void)ttg_longPressReopen {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.35 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self ttg_showMenu];
    });
}

%new
- (void)ttg_applyGlass {
    UIView *existing = [self viewWithTag:kGlassTag];
    if (!TTGEnabled()) { existing.hidden = YES; return; }
    existing.hidden = NO;
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
    CGFloat side = TTGFloating() ? 8 : 0, top = TTGFloating() ? 2 : 0;
    CGRect pill = CGRectMake(side, top, self.bounds.size.width - side * 2, barH - top + (bottomInset > 0 ? 8 : -4));

    UIVisualEffectView *glass = (UIVisualEffectView *)[self viewWithTag:kGlassTag];
    if (!glass) {
        glass = [[UIVisualEffectView alloc] initWithEffect:TTGEffect()];
        glass.tag = kGlassTag;
        if (@available(iOS 13.0, *)) glass.overrideUserInterfaceStyle = (TTGStyle() == 2) ? UIUserInterfaceStyleLight : UIUserInterfaceStyleDark;
        glass.userInteractionEnabled = NO;
        glass.clipsToBounds = YES;
        glass.layer.borderWidth = 0.6;
        glass.layer.borderColor = [UIColor colorWithWhite:1 alpha:0.18].CGColor;
        UIView *tint = [[UIView alloc] init];
        tint.backgroundColor = [UIColor colorWithWhite:0 alpha:(TTGStyle() == 2 ? 0.0 : 0.18)];
        tint.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [glass.contentView addSubview:tint];
        [self insertSubview:glass atIndex:0];
    } else if ([self.subviews indexOfObject:glass] != 0) {
        [self sendSubviewToBack:glass];
    }
    glass.frame = pill;
    if (!TTGFloating()) pill = self.bounds;
    glass.layer.cornerRadius = TTGFloating() ? pill.size.height / 2 : 0;
    glass.layer.borderWidth = TTGFloating() ? 0.6 : 0;
    if (@available(iOS 13.0, *)) glass.layer.cornerCurve = kCACornerCurveContinuous;
    for (UIView *t in glass.contentView.subviews) t.frame = glass.bounds;
}

%end

static void TTGRefreshIn(UIView *v) {
    if ([v isKindOfClass:[UITabBar class]]) { [v setNeedsLayout]; [v layoutIfNeeded]; return; }
    for (UIView *s in v.subviews) TTGRefreshIn(s);
}
static void TTGRefreshAll(void) {
    for (UIWindow *w in UIApplication.sharedApplication.windows) TTGRefreshIn(w);
}

// TikTok paints a black strip behind the tab bar on some screens.
%hook AWENormalModeTabBarController
- (void)viewDidLayoutSubviews {
    %orig;
    UIViewController *vc = (UIViewController *)self;
    if (![vc respondsToSelector:@selector(tabBar)]) return;
    UITabBar *tb = [(id)vc tabBar];
    if (!tb || !TTGEnabled()) return;
    UIView *root = vc.view;
    // the view that holds the tab bar directly under root
    UIView *barHost = tb;
    while (barHost.superview && barHost.superview != root) barHost = barHost.superview;
    barHost.backgroundColor = UIColor.clearColor;
    tb.superview.backgroundColor = UIColor.clearColor;
    if (!TTGUnder()) return;
    CGFloat barTop = [tb convertRect:tb.bounds toView:root].origin.y;
    CGFloat fullH = root.bounds.size.height;
    for (UIView *v in root.subviews) {
        if (v == barHost || v.hidden) continue;
        CGRect f = v.frame;
        if (fabs(CGRectGetMaxY(f) - barTop) < 3 && f.size.height > fullH * 0.5) {
            f.size.height = fullH - f.origin.y;
            v.frame = f;
        }
    }
    [root bringSubviewToFront:barHost];
}
%end
