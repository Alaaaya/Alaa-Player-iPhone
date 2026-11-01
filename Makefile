TARGET := iphone:clang:latest:15.0
ARCHS = arm64 arm64e
INSTALL_TARGET_PROCESSES = TikTok

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = TikTokGlass
TikTokGlass_FILES = Tweak.x
TikTokGlass_CFLAGS = -fobjc-arc -Wno-unguarded-availability-new -Wno-deprecated-declarations
TikTokGlass_FRAMEWORKS = UIKit QuartzCore
TikTokGlass_LOGOS_DEFAULT_GENERATOR = internal

include $(THEOS_MAKE_PATH)/tweak.mk
