// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import {
  OpaqueColorValue,
  type StyleProp,
  type TextStyle,
} from "react-native";

////////////////////////////////////////////////////////////
// TYPES (SIMPLIFIED TO AVOID ERRORS)
////////////////////////////////////////////////////////////

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type IconSymbolName =
  | "house.fill"
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right";

type IconMapping = Record<IconSymbolName, MaterialIconName>;

////////////////////////////////////////////////////////////
// ICON MAPPING
////////////////////////////////////////////////////////////

const MAPPING: IconMapping = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
};

////////////////////////////////////////////////////////////
// COMPONENT
////////////////////////////////////////////////////////////

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <MaterialIcons
      name={MAPPING[name] || "help-outline"} // fallback icon
      size={size}
      color={color}
      style={style}
    />
  );
}