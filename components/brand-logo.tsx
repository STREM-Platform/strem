import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const LOCKUP = require("@/assets/brand/logo-wordmark-glow.png");
const SYMBOL = require("@/assets/brand/logo-symbol-glow.png");

interface BrandLogoProps {
  variant?: "lockup" | "symbol";
  style?: StyleProp<ViewStyle>;
}

export function BrandLogo({ variant = "lockup", style }: BrandLogoProps) {
  if (variant === "lockup") {
    const flattened = StyleSheet.flatten(style) ?? {};
    const height = typeof flattened.height === "number" ? flattened.height : 170;
    const width = typeof flattened.width === "number" ? flattened.width : height;
    const sourceRatio = 16 / 9;

    return (
      <View
        accessibilityLabel="STREM logo"
        style={[
          styles.lockupFrame,
          style as StyleProp<ViewStyle>,
          {
            width,
            height,
          },
        ]}
      >
        <Image
          resizeMode="contain"
          source={LOCKUP}
          style={[
            styles.lockupImage,
            {
              width: height * sourceRatio,
              height,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel="STREM logo"
      resizeMode="contain"
      source={SYMBOL}
      style={style as StyleProp<ImageStyle>}
    />
  );
}

const styles = StyleSheet.create({
  lockupFrame: {
    overflow: "hidden",
  },
  lockupImage: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
