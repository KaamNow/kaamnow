import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

export default function AppScreen({
  children,
  edges = ["top"],
  backgroundColor = colors.bg,
  style,
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
