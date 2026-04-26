import "react-native-gesture-handler";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts as useOutfit,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import {
  useFonts as useManrope,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { colors, fonts } from "./src/theme";

import LandingScreen from "./src/screens/LandingScreen";
import StrategyScreen from "./src/screens/StrategyScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import MarketplaceScreen from "./src/screens/MarketplaceScreen";
import WorkerProfileScreen from "./src/screens/WorkerProfileScreen";
import PostJobScreen from "./src/screens/PostJobScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import WhatsAppDemoScreen from "./src/screens/WhatsAppDemoScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  const { user } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.saffron,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyBold,
          fontSize: 11,
        },
        tabBarIcon: ({ color, size }) => {
          const map = {
            Home: "home-outline",
            Workers: "people-outline",
            Chat: "chatbubble-outline",
            Strategy: "document-text-outline",
            Account: "person-outline",
          };
          return <Ionicons name={map[route.name] || "ellipse"} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={LandingScreen} />
      <Tab.Screen name="Workers" component={MarketplaceScreen} />
      <Tab.Screen name="Chat" component={WhatsAppDemoScreen} options={{ title: "WhatsApp" }} />
      <Tab.Screen name="Strategy" component={StrategyScreen} />
      <Tab.Screen
        name="Account"
        component={user ? DashboardScreen : LoginScreen}
        options={{ title: user ? "Dashboard" : "Login" }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.saffron} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      <Stack.Screen name="PostJob" component={PostJobScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [outfitLoaded] = useOutfit({ Outfit_700Bold, Outfit_800ExtraBold });
  const [manropeLoaded] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!outfitLoaded || !manropeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.saffron} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
