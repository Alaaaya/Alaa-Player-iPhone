// Alaa_TikTok - Instagram-style floating glass tab bar for TikTok
#import <UIKit/UIKit.h>
#import <objc/message.h>
#import <objc/runtime.h>
#import <AVFoundation/AVFoundation.h>
#import <MetalKit/MetalKit.h>
static char kBtnsKey;

static const NSInteger kGlassTag = 0x61A55;
static const NSInteger kSelTag   = 0x61A56;

#define kPrefEnabled  @"alaa_tt_glass_enabled"
#define kPrefFloating @"alaa_tt_glass_floating"
#define kPrefUnder    @"alaa_tt_video_under"
#define kPrefLabels   @"alaa_tt_hide_labels"
#define kPrefTheme    @"alaa_tt_theme_lamha"
static const NSInteger kDockTag = 0x61A57;
static char kLamhaKey;
#define kPrefStyle    @"alaa_tt_glass_style_v2"   // 0 liquid glass, 1 dark blur, 2 light blur

static NSUserDefaults *D(void) { return NSUserDefaults.standardUserDefaults; }
static BOOL PB(NSString *k, BOOL def) { id v = [D() objectForKey:k]; return v ? [v boolValue] : def; }
#define TTGEnabled()  PB(kPrefEnabled, YES)
#define TTGFloating() PB(kPrefFloating, YES)
#define TTGUnder()    PB(kPrefUnder, YES)
#define TTGNoLabels() PB(kPrefLabels, YES)
#define TTGTheme()    PB(kPrefTheme, YES)
static NSInteger TTGStyle(void) { return [D() integerForKey:kPrefStyle]; }
static void TTGRefreshAll(void);

@interface UITabBar (TTGlass)
- (void)ttg_applyGlass;
- (void)ttg_longPress:(UILongPressGestureRecognizer *)g;
- (void)ttg_showMenu;
- (void)ttg_reopen;
- (void)lamha_layout:(NSArray<UIView *> *)buttons;
- (void)lamha_tap:(UIButton *)b;
@end

// ===== Lamha theme (2.0) =====
static UIColor *LCoral(void) { return [UIColor colorWithRed:0.95 green:0.45 blue:0.36 alpha:1]; }
static UIColor *LPlum(CGFloat a) { return [UIColor colorWithRed:0.16 green:0.09 blue:0.14 alpha:a]; }

static void TTGActivate(UIView *b) {
    if ([b isKindOfClass:[UIControl class]]) {
        UIControl *c = (UIControl *)b;
        [c sendActionsForControlEvents:UIControlEventTouchDown];
        [c sendActionsForControlEvents:UIControlEventTouchUpInside];
        return;
    }
    for (UIGestureRecognizer *r in b.gestureRecognizers) {
        if (![r isKindOfClass:[UITapGestureRecognizer class]]) continue;
        @try {
            NSArray *targets = [r valueForKey:@"_targets"];
            for (id t in targets) {
                Ivar it = class_getInstanceVariable([t class], "_target");
                Ivar ia = class_getInstanceVariable([t class], "_action");
                if (!it || !ia) continue;
                id target = object_getIvar(t, it);
                SEL act = *(SEL *)((uint8_t *)(__bridge void *)t + ivar_getOffset(ia));
                if (target && act) ((void (*)(id, SEL, id))objc_msgSend)(target, act, r);
            }
        } @catch (__unused id ex) {}
    }
}

static BOOL TTGHasBadge(UIView *v, int d) {
    if (d > 6 || v.hidden || v.alpha < 0.05) return NO;
    if ([v isKindOfClass:[UILabel class]]) {
        NSString *t = ((UILabel *)v).text;
        if (t.length && [t rangeOfCharacterFromSet:NSCharacterSet.decimalDigitCharacterSet].location != NSNotFound) return YES;
    }
    for (UIView *s in v.subviews) if (TTGHasBadge(s, d + 1)) return YES;
    return NO;
}

static UIImage *LSym(NSString *n, CGFloat pt) {
    UIImageSymbolConfiguration *c = [UIImageSymbolConfiguration configurationWithPointSize:pt weight:UIImageSymbolWeightMedium];
    return [UIImage systemImageNamed:n withConfiguration:c];
}

static void TTGCapsule(UIView *v, BOOL on) {
    if (!on || ![v respondsToSelector:NSSelectorFromString(@"setCornerConfiguration:")]) return;
    Class cc = NSClassFromString(@"UICornerConfiguration");
    id cfg = nil;
    for (NSString *n in @[@"capsuleConfiguration", @"capsule"]) {
        SEL sl = NSSelectorFromString(n);
        if ([cc respondsToSelector:sl]) { cfg = ((id (*)(id, SEL))objc_msgSend)(cc, sl); break; }
    }
    if (cfg) ((void (*)(id, SEL, id))objc_msgSend)(v, NSSelectorFromString(@"setCornerConfiguration:"), cfg);
}

static UIVisualEffect *TTGEffect(void) {
    NSInteger st = TTGStyle();
    if (st == 1) return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterialDark];
    if (st == 2) return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterialLight];
    Class glassCls = NSClassFromString(@"UIGlassEffect"); // iOS 26 Liquid Glass
    if (glassCls) {
        id e = [glassCls respondsToSelector:@selector(effectWithStyle:)] ? ((id (*)(id, SEL, NSInteger))objc_msgSend)(glassCls, @selector(effectWithStyle:), 1) : [[glassCls alloc] init]; // 1 = clear glass
        if ([e respondsToSelector:@selector(setTintColor:)])
            ((void (*)(id, SEL, id))objc_msgSend)(e, @selector(setTintColor:), [UIColor colorWithWhite:0 alpha:0.12]);
        if ([e respondsToSelector:@selector(setInteractive:)])
            ((void (*)(id, SEL, BOOL))objc_msgSend)(e, @selector(setInteractive:), YES);
        return e;
    }
    return [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterialDark];
}

static BOOL TTGIsButton(UIView *v) {
    if (v.tag == kGlassTag || v.tag == kSelTag) return NO;
    if ([v isKindOfClass:[UIControl class]]) return YES;
    NSString *n = NSStringFromClass([v class]);
    return [n containsString:@"Button"];
}

static BOOL TTGIsSelected(UIView *b) {
    if ([b isKindOfClass:[UIControl class]] && ((UIControl *)b).isSelected) return YES;
    for (NSString *k in @[@"isSelected", @"selected", @"isCurrent"]) {
        SEL s = NSSelectorFromString(k);
        if ([b respondsToSelector:s]) {
            @try { if ([[b valueForKey:k] boolValue]) return YES; } @catch (__unused id e) {}
        }
    }
    return NO;
}

static void TTGCollectButtons(UIView *v, NSMutableArray *out, int d) {
    if (d > 4) return;
    for (UIView *s in v.subviews) {
        if (s.tag == kGlassTag || s.tag == kSelTag) continue;
        if (TTGIsButton(s) && s.bounds.size.width >= 30 && s.bounds.size.width <= 160) [out addObject:s];
        else TTGCollectButtons(s, out, d + 1);
    }
}
static void TTGClearBG(UIView *v) {
    for (UIView *s in v.subviews) {
        if (TTGIsButton(s)) continue;
        if ([s isKindOfClass:[UIImageView class]] && s.bounds.size.width > 200) s.hidden = YES;
        else if (s.bounds.size.width > 200) { s.backgroundColor = UIColor.clearColor; TTGClearBG(s); }
    }
}

static void TTGSetLabelsHidden(UIView *v, BOOL hidden) {
    for (UIView *s in v.subviews) {
        if ([s isKindOfClass:[UILabel class]]) {
            NSString *t = ((UILabel *)s).text;
            // keep badge counters (digits) visible
            BOOL isBadge = t.length && [t rangeOfCharacterFromSet:NSCharacterSet.decimalDigitCharacterSet.invertedSet].location == NSNotFound;
            if (!isBadge) s.alpha = hidden ? 0 : 1;
        } else TTGSetLabelsHidden(s, hidden);
    }
}

// ---------- pushing the feed under the bar ----------
static void TTGExtend(UIView *v, CGFloat barTop, CGFloat bottom, UIView *skip, int depth) {
    if (!v || depth > 9 || v == skip || v.hidden) return;
    UIWindow *w = v.window; if (!w) return;
    for (UIView *s in v.subviews) {
        if (s == skip || s.hidden || [s isKindOfClass:[UITabBar class]]) continue;
        CGRect r = [s convertRect:s.bounds toView:w];
        if (r.size.height > w.bounds.size.height * 0.4 && fabs(CGRectGetMaxY(r) - barTop) < 4) {
            CGRect f = s.frame;
            f.size.height += (bottom - barTop);
            s.frame = f;
        }
        TTGExtend(s, barTop, bottom, skip, depth + 1);
    }
}

%hook UITabBar

- (void)didMoveToWindow {
    %orig;
    BOOL has = NO;
    for (UIGestureRecognizer *g in self.gestureRecognizers) if ([g.name isEqualToString:@"Alaa_TikTok"]) has = YES;
    if (!has) {
        UILongPressGestureRecognizer *lp = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(ttg_longPress:)];
        lp.name = @"Alaa_TikTok";
        lp.minimumPressDuration = 0.9;
        lp.cancelsTouchesInView = NO;
        [self addGestureRecognizer:lp];
    }
    if (!TTGEnabled()) return;
    UITabBarAppearance *ap = [UITabBarAppearance new];
    [ap configureWithTransparentBackground];
    ap.shadowColor = UIColor.clearColor;
    self.standardAppearance = ap;
    if (@available(iOS 15.0, *)) self.scrollEdgeAppearance = ap;
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
    [[[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleMedium] impactOccurred];
    [self ttg_showMenu];
}

%new
- (void)ttg_showMenu {
    UIViewController *top = self.window.rootViewController;
    while (top.presentedViewController) top = top.presentedViewController;
    if (!top) return;
    NSArray *styles = @[@"Liquid Glass", @"ضبابي داكن", @"ضبابي فاتح"];
    UIAlertController *ac = [UIAlertController alertControllerWithTitle:@"Alaa_TikTok"
        message:@"إعدادات الشريط\n(الإطفاء الكامل بيتطبّق بعد ما تسكّر TikTok وترجع تفتحه)" preferredStyle:UIAlertControllerStyleActionSheet];
    __weak UITabBar *ws = self;
    void (^toggle)(NSString *, NSString *, BOOL) = ^(NSString *title, NSString *key, BOOL def) {
        BOOL on = PB(key, def);
        [ac addAction:[UIAlertAction actionWithTitle:[NSString stringWithFormat:@"%@ %@", on ? @"✅" : @"⬜️", title]
            style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
                [D() setBool:!on forKey:key]; TTGRefreshAll(); [ws ttg_reopen]; }]];
    };
    toggle(@"ثيم لمحة 🧡", kPrefTheme, YES);
    toggle(@"الشريط الزجاجي", kPrefEnabled, YES);
    toggle(@"كبسولة عائمة (متل انستا)", kPrefFloating, YES);
    toggle(@"الفيديو تحت الشريط", kPrefUnder, YES);
    toggle(@"إخفاء الأسماء (أيقونات بس)", kPrefLabels, YES);
    [ac addAction:[UIAlertAction actionWithTitle:[NSString stringWithFormat:@"🎨 النمط: %@", styles[MAX(0, MIN(2, TTGStyle()))]]
        style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
            [D() setInteger:(TTGStyle() + 1) % 3 forKey:kPrefStyle];
            [[ws viewWithTag:kGlassTag] removeFromSuperview];
            TTGRefreshAll(); [ws ttg_reopen]; }]];
    [ac addAction:[UIAlertAction actionWithTitle:@"📋 نسخ هيكل الواجهة (للمطوّر)" style:UIAlertActionStyleDefault handler:^(UIAlertAction *a) {
        NSMutableString *out = [NSMutableString string];
        UIWindow *w = ws.window;
        __block void (^dump)(UIView *, int);
        __block __weak void (^wdump)(UIView *, int);
        wdump = dump = ^(UIView *v, int d) {
            if (d > 30 || out.length > 24000) return;
            CGRect r = [v convertRect:v.bounds toView:w];
            BOOL inBar = [v isDescendantOfView:ws];
            CGFloat WW = w.bounds.size.width;
            BOOL onScreen = CGRectIntersectsRect(r, w.bounds) && !v.hidden;
            BOOL rightCol = onScreen && r.origin.x > WW - 120 && r.size.width >= 24 && r.size.width <= 120 && r.size.height >= 24 && r.size.height <= 140;
            BOOL topBar = onScreen && r.origin.y < 230 && r.origin.y > 30 && r.size.height >= 18 && r.size.height <= 80 && r.size.width >= 30;
            BOOL caption = onScreen && r.origin.y > 450 && r.origin.x < WW / 2 + 40 && r.size.height >= 16 && r.size.width >= 120 && r.size.height < 300;
            if (r.size.height >= 300 || inBar || d < 3 || rightCol || topBar || caption || (CGRectGetMaxY(r) > w.bounds.size.height - 220 && r.size.height >= 18 && r.size.width >= 120)) {
                NSString *txt = @"";
                if ([v isKindOfClass:[UILabel class]] && ((UILabel *)v).text.length) txt = [NSString stringWithFormat:@" \"%@\"", [((UILabel *)v).text substringToIndex:MIN((NSUInteger)24, ((UILabel *)v).text.length)]];
                [out appendFormat:@"%@%@ %.0f,%.0f %.0fx%.0f%@%@\n", [@"" stringByPaddingToLength:d withString:@" " startingAtIndex:0],
                    NSStringFromClass(v.class), r.origin.x, r.origin.y, r.size.width, r.size.height, v.hidden ? @" H" : @"", txt];
            }
            for (UIView *s in v.subviews) wdump(s, d + 1);
        };
        dump(w, 0);
        [out appendFormat:@"tabbar %@\n", NSStringFromCGRect([ws convertRect:ws.bounds toView:w])];
        UIPasteboard.generalPasteboard.string = out;
    }]];
    [ac addAction:[UIAlertAction actionWithTitle:@"تم" style:UIAlertActionStyleCancel handler:nil]];
    if (ac.popoverPresentationController) { ac.popoverPresentationController.sourceView = self; ac.popoverPresentationController.sourceRect = self.bounds; }
    [top presentViewController:ac animated:YES completion:nil];
}

- (UIView *)hitTest:(CGPoint)p withEvent:(UIEvent *)e {
    UIView *dock = [self viewWithTag:kDockTag];
    if (dock && !dock.hidden && TTGEnabled() && TTGTheme() && !self.hidden && self.alpha > 0.01) {
        UIView *h = [dock hitTest:[self convertPoint:p toView:dock] withEvent:e];
        if (h) return h;
    }
    NSArray *info = objc_getAssociatedObject(self, &kBtnsKey);
    if (info && TTGEnabled() && !self.hidden && self.alpha > 0.01) {
        CGRect pill = [info[1] CGRectValue];
        if (CGRectContainsPoint(CGRectInset(pill, -4, -8), p)) {
            if (![objc_getAssociatedObject(self, @selector(ttg_tap:)) boolValue]) {
                UITapGestureRecognizer *tg = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(ttg_tap:)];
                tg.cancelsTouchesInView = YES;
                [self addGestureRecognizer:tg];
                objc_setAssociatedObject(self, @selector(ttg_tap:), @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
            }
            return self;
        }
    }
    return %orig;
}

%new
- (void)ttg_tap:(UITapGestureRecognizer *)g {
    NSArray *info = objc_getAssociatedObject(self, &kBtnsKey);
    if (!info) return;
    NSArray<UIView *> *btns = info[0]; CGRect pill = [info[1] CGRectValue];
    CGFloat x = [g locationInView:self].x;
    CGFloat slotW = (pill.size.width - 12) / btns.count;
    NSInteger i = (NSInteger)floor((x - pill.origin.x - 6) / slotW);
    i = MAX(0, MIN((NSInteger)btns.count - 1, i));
    UIView *b = btns[i];
    if ([b isKindOfClass:[UIControl class]]) {
        UIControl *c = (UIControl *)b;
        [c sendActionsForControlEvents:UIControlEventTouchDown];
        [c sendActionsForControlEvents:UIControlEventTouchUpInside];
    } else {
        for (UIGestureRecognizer *r in b.gestureRecognizers) {
            if ([r isKindOfClass:[UITapGestureRecognizer class]]) {
                @try {
                    NSArray *targets = [r valueForKey:@"_targets"];
                    for (id t in targets) {
                        Ivar it = class_getInstanceVariable([t class], "_target");
                        Ivar ia = class_getInstanceVariable([t class], "_action");
                        if (!it || !ia) continue;
                        id target = object_getIvar(t, it);
                        SEL act = *(SEL *)((uint8_t *)(__bridge void *)t + ivar_getOffset(ia));
                        if (target && act) ((void (*)(id, SEL, id))objc_msgSend)(target, act, r);
                    }
                } @catch (__unused id ex) {}
            }
        }
    }
    dispatch_async(dispatch_get_main_queue(), ^{ [self setNeedsLayout]; });
}

%new
- (void)lamha_tap:(UIButton *)sender {
    NSArray *btns = objc_getAssociatedObject(self, &kLamhaKey);
    NSInteger i = sender.tag - 100;
    if (i < 0 || i >= (NSInteger)btns.count) return;
    [[[UISelectionFeedbackGenerator alloc] init] selectionChanged];
    TTGActivate(btns[i]);
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.15 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ [self setNeedsLayout]; });
}

%new
- (void)lamha_layout:(NSArray<UIView *> *)buttons {
    objc_setAssociatedObject(self, &kLamhaKey, [buttons copy], OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    for (UIView *b in buttons) { b.alpha = 0; b.layer.sublayerTransform = CATransform3DIdentity; }
    self.backgroundColor = UIColor.clearColor;
    self.clipsToBounds = NO;

    NSUInteger n = buttons.count;
    NSArray *icons, *names;
    if (n == 5) {
        icons = @[@"person", @"bubble.left", @"plus", @"safari", @"house"];
        names = @[@"ملفي", @"الرسائل", @"إنشاء", @"استكشاف", @"الرئيسية"];
    } else {
        NSMutableArray *a = [NSMutableArray array], *b = [NSMutableArray array];
        for (NSUInteger i = 0; i < n; i++) { [a addObject:@"circle"]; [b addObject:@""]; }
        icons = a; names = b;
    }
    NSInteger center = (n == 5) ? 2 : -1;

    CGFloat W = self.bounds.size.width, H = self.bounds.size.height;
    CGFloat bottomInset = self.window ? self.window.safeAreaInsets.bottom : 0;
    CGFloat dockH = 72, bottomGap = bottomInset > 0 ? MAX(bottomInset - 14, 8) : 8;
    CGRect df = CGRectMake(14, H - bottomGap - dockH, W - 28, dockH);

    UIView *dock = [self viewWithTag:kDockTag];
    if (!dock || dock.subviews.count != n + 1) {
        [dock removeFromSuperview];
        dock = [[UIView alloc] initWithFrame:df];
        dock.tag = kDockTag;
        dock.clipsToBounds = NO;

        UIView *bgWrap = [[UIView alloc] initWithFrame:dock.bounds];
        bgWrap.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        bgWrap.userInteractionEnabled = NO;
        bgWrap.layer.cornerRadius = 28; bgWrap.layer.cornerCurve = kCACornerCurveContinuous;
        bgWrap.layer.shadowColor = UIColor.blackColor.CGColor; bgWrap.layer.shadowOpacity = 0.45;
        bgWrap.layer.shadowRadius = 18; bgWrap.layer.shadowOffset = CGSizeMake(0, 8);
        UIVisualEffectView *blur = [[UIVisualEffectView alloc] initWithEffect:[UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterialDark]];
        blur.frame = bgWrap.bounds; blur.autoresizingMask = bgWrap.autoresizingMask;
        blur.layer.cornerRadius = 28; blur.layer.cornerCurve = kCACornerCurveContinuous; blur.clipsToBounds = YES;
        blur.layer.borderWidth = 0.8; blur.layer.borderColor = [UIColor colorWithRed:1 green:0.8 blue:0.75 alpha:0.14].CGColor;
        UIView *tint = [[UIView alloc] initWithFrame:blur.bounds];
        tint.autoresizingMask = bgWrap.autoresizingMask; tint.backgroundColor = LPlum(0.62);
        [blur.contentView addSubview:tint];
        [bgWrap addSubview:blur];
        [dock addSubview:bgWrap];

        for (NSUInteger i = 0; i < n; i++) {
            UIButton *it = [UIButton buttonWithType:UIButtonTypeCustom];
            it.tag = 100 + i;
            it.clipsToBounds = NO;
            [it addTarget:self action:@selector(lamha_tap:) forControlEvents:UIControlEventTouchUpInside];
            UIImageView *iv = [UIImageView new]; iv.tag = 1; iv.contentMode = UIViewContentModeCenter; iv.userInteractionEnabled = NO;
            UILabel *lb = [UILabel new]; lb.tag = 2; lb.textAlignment = NSTextAlignmentCenter; lb.userInteractionEnabled = NO;
            lb.font = [UIFont systemFontOfSize:11.5 weight:UIFontWeightSemibold]; lb.text = names[i];
            UIView *dot = [UIView new]; dot.tag = 3; dot.backgroundColor = LCoral(); dot.layer.cornerRadius = 2.5; dot.userInteractionEnabled = NO;
            UIView *badge = [UIView new]; badge.tag = 4; badge.backgroundColor = LCoral(); badge.layer.cornerRadius = 4.5; badge.userInteractionEnabled = NO;
            if ((NSInteger)i == center) {
                UIView *ring = [UIView new]; ring.tag = 5; ring.userInteractionEnabled = NO;
                ring.backgroundColor = LPlum(0.92); ring.layer.cornerRadius = 22; ring.layer.cornerCurve = kCACornerCurveContinuous;
                ring.layer.borderWidth = 0.8; ring.layer.borderColor = [UIColor colorWithRed:1 green:0.8 blue:0.75 alpha:0.14].CGColor;
                UIView *circ = [UIView new]; circ.tag = 6; circ.userInteractionEnabled = NO; circ.clipsToBounds = NO;
                CAGradientLayer *g = [CAGradientLayer layer];
                g.colors = @[(id)[UIColor colorWithRed:0.98 green:0.55 blue:0.42 alpha:1].CGColor, (id)[UIColor colorWithRed:0.90 green:0.33 blue:0.33 alpha:1].CGColor];
                g.startPoint = CGPointMake(0.2, 0); g.endPoint = CGPointMake(0.8, 1);
                g.name = @"lg";
                [circ.layer addSublayer:g];
                circ.layer.shadowColor = LCoral().CGColor; circ.layer.shadowOpacity = 0.55; circ.layer.shadowRadius = 12; circ.layer.shadowOffset = CGSizeZero;
                iv.image = LSym(@"plus", 26); iv.tintColor = UIColor.whiteColor;
                [it addSubview:ring]; [it addSubview:circ]; [circ addSubview:iv];
            } else {
                [it addSubview:iv];
            }
            [it addSubview:lb]; [it addSubview:dot]; [it addSubview:badge];
            [dock addSubview:it];
        }
        [self addSubview:dock];
    }
    dock.hidden = NO;
    dock.frame = df;
    [self bringSubviewToFront:dock];

    NSInteger selIdx = -1;
    for (NSUInteger i = 0; i < n; i++) if (TTGIsSelected(buttons[i])) { selIdx = i; break; }
    if (selIdx < 0 && self.selectedItem && self.items.count == n) selIdx = [self.items indexOfObject:self.selectedItem];

    CGFloat slot = df.size.width / n;
    for (NSUInteger i = 0; i < n; i++) {
        UIButton *it = (UIButton *)[dock viewWithTag:100 + i];
        UIImageView *iv = (UIImageView *)[it viewWithTag:1];
        UILabel *lb = (UILabel *)[it viewWithTag:2];
        UIView *dot = [it viewWithTag:3], *badge = [it viewWithTag:4];
        BOOL sel = ((NSInteger)i == selIdx);
        if ((NSInteger)i == center) {
            CGFloat cw = MIN(slot, 84);
            it.frame = CGRectMake(slot * i + (slot - cw) / 2, -26, cw, dockH + 26);
            UIView *ring = [it viewWithTag:5], *circ = [it viewWithTag:6];
            ring.frame = CGRectMake(0, 0, cw, dockH + 26 - 2);
            circ.frame = CGRectMake((cw - 58) / 2, 8, 58, 58);
            circ.layer.cornerRadius = 29;
            for (CALayer *l in circ.layer.sublayers) if ([l.name isEqualToString:@"lg"]) { l.frame = circ.bounds; l.cornerRadius = 29; }
            iv.frame = circ.bounds;
            lb.frame = CGRectMake(0, 70, cw, 18);
            lb.textColor = UIColor.whiteColor;
            dot.hidden = YES; badge.hidden = YES;
            continue;
        }
        it.frame = CGRectMake(slot * i, 0, slot, dockH);
        NSString *icon = icons[i];
        if (sel && n == 5) icon = [icon stringByAppendingString:@".fill"];
        iv.image = LSym(icon, 21);
        iv.tintColor = sel ? LCoral() : [UIColor colorWithWhite:1 alpha:0.92];
        iv.frame = CGRectMake(0, 10, slot, 28);
        lb.frame = CGRectMake(0, 40, slot, 16);
        lb.textColor = sel ? LCoral() : [UIColor colorWithWhite:1 alpha:0.92];
        dot.frame = CGRectMake(slot / 2 - 2.5, 59, 5, 5);
        dot.hidden = !sel;
        badge.frame = CGRectMake(slot / 2 + 9, 8, 9, 9);
        badge.hidden = !TTGHasBadge(buttons[i], 0);
    }
}

%new
- (void)ttg_reopen {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.35 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ [self ttg_showMenu]; });
}

%new
- (void)ttg_applyGlass {
    UIView *glass0 = [self viewWithTag:kGlassTag];
    if (!TTGEnabled()) { glass0.hidden = YES; [self viewWithTag:kSelTag].hidden = YES; [self viewWithTag:kDockTag].hidden = YES; return; }
    glass0.hidden = NO;
    self.backgroundColor = UIColor.clearColor;
    self.clipsToBounds = NO;

    NSMutableArray<UIView *> *buttons = [NSMutableArray array];
    for (UIView *v in self.subviews) {
        if (v.tag == kGlassTag || v.tag == kSelTag || v.tag == kDockTag) continue;
        if (TTGIsButton(v)) { [buttons addObject:v]; continue; }
        if ([v isKindOfClass:[UIImageView class]] || [v isKindOfClass:[UIVisualEffectView class]]) { v.hidden = YES; continue; }
        NSMutableArray *inner = [NSMutableArray array];
        TTGCollectButtons(v, inner, 0);
        if (inner.count) { [buttons addObjectsFromArray:inner]; v.backgroundColor = UIColor.clearColor; TTGClearBG(v); }
        else if (v.subviews.count == 0) v.hidden = YES;
        else v.backgroundColor = UIColor.clearColor;
    }
    [buttons sortUsingComparator:^NSComparisonResult(UIView *a, UIView *b) {
        CGFloat ax = [a.superview convertPoint:a.center toView:self].x, bx = [b.superview convertPoint:b.center toView:self].x;
        return [@(ax) compare:@(bx)]; }];

    if (TTGTheme() && buttons.count >= 3) {
        glass0.hidden = YES; [self viewWithTag:kSelTag].hidden = YES;
        objc_setAssociatedObject(self, &kBtnsKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        [self lamha_layout:buttons];
        return;
    }
    [self viewWithTag:kDockTag].hidden = YES;
    for (UIView *b in buttons) if (b.alpha < 0.05) b.alpha = 1;

    CGFloat W = self.bounds.size.width;
    CGFloat bottomInset = self.window ? self.window.safeAreaInsets.bottom : 0;
    BOOL noLabels = TTGNoLabels();
    CGRect pill;
    if (TTGFloating()) {
        CGFloat h = 64, pw = MIN(W * 0.76, 340);
        CGFloat y = self.bounds.size.height - bottomInset - h + (bottomInset > 0 ? 12 : -6);
        if (y < 0) y = 0;
        pill = CGRectMake((W - pw) / 2, y, pw, h);
    } else {
        pill = self.bounds;
    }

    UIVisualEffectView *glass = (UIVisualEffectView *)glass0;
    if (!glass) {
        glass = [[UIVisualEffectView alloc] initWithEffect:TTGEffect()];
        glass.tag = kGlassTag;
        glass.userInteractionEnabled = NO;
        glass.clipsToBounds = (TTGStyle() != 0 || !NSClassFromString(@"UIGlassEffect"));
        glass.overrideUserInterfaceStyle = (TTGStyle() == 2) ? UIUserInterfaceStyleLight : UIUserInterfaceStyleDark;
        glass.layer.borderColor = [UIColor colorWithWhite:1 alpha:0.14].CGColor;
        [self insertSubview:glass atIndex:0];
    } else if (self.subviews.firstObject != glass) {
        [self sendSubviewToBack:glass];
    }
    glass.frame = pill;
    glass.layer.cornerRadius = TTGFloating() ? pill.size.height / 2 : 0;
    glass.layer.cornerCurve = kCACornerCurveContinuous;
    TTGCapsule(glass, TTGFloating());
    if (TTGStyle() == 0 && NSClassFromString(@"UIGlassEffect")) glass.layer.borderWidth = 0;
    glass.layer.borderWidth = TTGFloating() ? 0.6 : 0;

    // Instagram-style layout: move buttons into the pill with transforms (TikTok re-lays frames, not transforms).
    NSMutableArray *targets = [NSMutableArray array];
    CGFloat slotW = (pill.size.width - 12) / MAX((NSUInteger)1, buttons.count);
    for (NSUInteger i = 0; i < buttons.count; i++) {
        UIView *b = buttons[i];
        CGPoint c = [b.superview convertPoint:b.center toView:self];
        CGPoint t = c;
        if (TTGFloating() && buttons.count >= 3) {
            t = CGPointMake(pill.origin.x + 6 + slotW * (i + 0.5), CGRectGetMidY(pill) + (noLabels ? 8 : 0));
        }
        if (!CGAffineTransformIsIdentity(b.transform)) b.transform = CGAffineTransformIdentity;
        b.layer.sublayerTransform = CATransform3DMakeTranslation(t.x - c.x, t.y - c.y, 0);
        [targets addObject:[NSValue valueWithCGPoint:CGPointMake(t.x, CGRectGetMidY(pill))]];
    }
    for (UIView *b in buttons) TTGSetLabelsHidden(b, noLabels);
    objc_setAssociatedObject(self, &kBtnsKey, (TTGFloating() && buttons.count >= 3) ? @[[buttons copy], [NSValue valueWithCGRect:pill]] : nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);

    // highlight capsule behind the selected tab
    UIView *sel = [self viewWithTag:kSelTag];
    if (!sel) {
        Class gc = NSClassFromString(@"UIGlassEffect");
        if (gc && TTGStyle() == 0) {
            id ge = [gc respondsToSelector:@selector(effectWithStyle:)] ? ((id (*)(id, SEL, NSInteger))objc_msgSend)(gc, @selector(effectWithStyle:), 1) : [[gc alloc] init];
            if ([ge respondsToSelector:@selector(setTintColor:)])
                ((void (*)(id, SEL, id))objc_msgSend)(ge, @selector(setTintColor:), [UIColor colorWithWhite:1 alpha:0.10]);
            sel = [[UIVisualEffectView alloc] initWithEffect:ge];
        } else {
            sel = [UIView new];
            sel.backgroundColor = [UIColor colorWithWhite:1 alpha:0.16];
        }
        sel.tag = kSelTag;
        sel.userInteractionEnabled = NO;
        [self insertSubview:sel aboveSubview:glass];
    }
    NSInteger selIdx = -1;
    for (NSUInteger i = 0; i < buttons.count; i++) if (TTGIsSelected(buttons[i])) { selIdx = i; break; }
    if (selIdx < 0 && [self respondsToSelector:@selector(selectedItem)] && self.selectedItem && self.items.count == buttons.count)
        selIdx = [self.items indexOfObject:self.selectedItem];
    if (NO && selIdx >= 0 && selIdx < (NSInteger)targets.count && TTGFloating()) { // highlight removed (1.10)
        CGFloat sw = MIN(slotW + 4, 92), sh = pill.size.height - 10;
        CGPoint tc = [targets[selIdx] CGPointValue];
        sel.frame = CGRectMake(tc.x - sw / 2, pill.origin.y + 5, sw, sh);
        sel.layer.cornerRadius = sh / 2;
        sel.layer.cornerCurve = kCACornerCurveContinuous;
        TTGCapsule(sel, YES);
        sel.hidden = NO;
    } else sel.hidden = YES;
}

%end

static void TTGRefreshIn(UIView *v) {
    if ([v isKindOfClass:[UITabBar class]]) { [v setNeedsLayout]; [v layoutIfNeeded]; return; }
    for (UIView *s in v.subviews) TTGRefreshIn(s);
}
static void TTGRefreshAll(void) {
    for (UIWindow *w in UIApplication.sharedApplication.windows) TTGRefreshIn(w);
}

static BOOL TTGIsVideoView(UIView *v) {
    if ([v.layer isKindOfClass:[AVPlayerLayer class]]) return YES;
    for (CALayer *l in v.layer.sublayers) if ([l isKindOfClass:[AVPlayerLayer class]]) return YES;
    NSString *n = NSStringFromClass(v.class).lowercaseString;
    if ([n containsString:@"interact"] || [n containsString:@"overlay"] || [n containsString:@"control"] || [n containsString:@"mask"]) return NO;
    return [n containsString:@"player"] || [n containsString:@"video"] || [n containsString:@"cover"] || [n containsString:@"render"] || [v isKindOfClass:[UIImageView class]];
}

static void TTGFillFeed(UIView *v, CGFloat barTop, CGFloat fullH, int d) {
    if (d > 16) return;
    for (UIView *s in v.subviews) {
        if (s.hidden) continue;
        CGFloat ph = s.superview.bounds.size.height;
        BOOL parentOK = ph >= fullH - 4 || fabs(ph - barTop) < 4;
        if (fabs(s.frame.size.height - barTop) < 4 && fabs(s.frame.origin.y) < 2 && parentOK && TTGIsVideoView(s)) {
            CGRect f = s.frame; f.size.height = fullH; s.frame = f;
            for (UIView *p = s.superview; p && p != v.window; p = p.superview) {
                if (p.bounds.size.height >= fullH - 4) break;
                p.clipsToBounds = NO;
            }
        }
        TTGFillFeed(s, barTop, fullH, d + 1);
    }
}

%hook AWEFeedSlidingScrollView
- (void)layoutSubviews {
    %orig;
    UIView *me = (UIView *)self;
    UIWindow *w = me.window;
    if (!w || !TTGEnabled() || !TTGUnder()) return;
    CGFloat fullH = w.bounds.size.height;
    CGFloat barTop = fullH - 83;
    for (UIWindow *ww in UIApplication.sharedApplication.windows) {
        UIView *tb = nil; NSMutableArray *st = [NSMutableArray arrayWithObject:ww];
        while (st.count && !tb) { UIView *x = st.lastObject; [st removeLastObject];
            if ([x isKindOfClass:[UITabBar class]] && !x.hidden) tb = x; else [st addObjectsFromArray:x.subviews]; }
        if (tb) { barTop = [tb convertRect:tb.bounds toView:w].origin.y; break; }
    }
    if (fullH - barTop < 20) return;
    TTGFillFeed(me, barTop, fullH, 0);
}
%end

%hook AWENormalModeTabBarController
- (void)viewDidLayoutSubviews {
    %orig;
    UIViewController *vc = (UIViewController *)self;
    if (![vc respondsToSelector:@selector(tabBar)] || !TTGEnabled()) return;
    UITabBar *tb = [(id)vc tabBar];
    UIView *root = vc.view;
    if (!tb || !root.window) return;
    UIView *barHost = tb;
    while (barHost.superview && barHost.superview != root) barHost = barHost.superview;
    barHost.backgroundColor = UIColor.clearColor;
    tb.superview.backgroundColor = UIColor.clearColor;
    if (!TTGUnder()) return;
    UIWindow *w = root.window;
    CGFloat barTop = [tb convertRect:tb.bounds toView:w].origin.y;
    CGFloat bottom = w.bounds.size.height;
    if (bottom - barTop < 20) return;
    TTGExtend(root, barTop, bottom, barHost, 0);
    root.backgroundColor = UIColor.clearColor;
    [root bringSubviewToFront:barHost];
}
%end

// ---- 1.7: stretch the feed player into the area under the floating bar ----
static CGFloat TTGBarH(void) { return 83.0; }
static CGRect TTGStretch(UIView *v, CGRect f) {
    if (!TTGEnabled() || !TTGUnder()) return f;
    CGFloat full = UIScreen.mainScreen.bounds.size.height;
    CGFloat barTop = full - TTGBarH();
    if (fabs(f.size.height - barTop) < 4) f.size.height = full;
    return f;
}
static void TTGUnclip(UIView *v) {
    CGFloat full = UIScreen.mainScreen.bounds.size.height;
    for (UIView *p = v.superview; p; p = p.superview) {
        if (p.bounds.size.height >= full - 4) break;
        if (p.clipsToBounds) p.clipsToBounds = NO;
    }
}

%hook AWEPlayVideoPlayerControllerBackgroundView
- (void)setFrame:(CGRect)f { %orig(TTGStretch((UIView *)self, f)); }
- (void)layoutSubviews { %orig; if (TTGEnabled() && TTGUnder()) TTGUnclip((UIView *)self); }
%end
%hook TTKFeedPlayerContainerView
- (void)setFrame:(CGRect)f { %orig(TTGStretch((UIView *)self, f)); }
%end
%hook TTPlayerView
- (void)setFrame:(CGRect)f { %orig(TTGStretch((UIView *)self, f)); }
%end
%hook TTMetalView
- (void)setFrame:(CGRect)f { %orig(TTGStretch((UIView *)self, f)); }
%end
%hook MTKView
- (void)setFrame:(CGRect)f { if ([((UIView *)self).superview isKindOfClass:NSClassFromString(@"TTMetalView")]) %orig(TTGStretch((UIView *)self, f)); else %orig; }
%end
%hook TTKMediaBusinessCoverImageView
- (void)setFrame:(CGRect)f { %orig(TTGStretch((UIView *)self, f)); }
%end
