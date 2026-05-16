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
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { colors, fonts } from "./src/theme";

import LandingScreen from "./src/screens/LandingScreen";
import MarketplaceScreen from "./src/screens/MarketplaceScreen";
import WorkerProfileScreen from "./src/screens/WorkerProfileScreen";
import WorkerOnboardingScreen from "./src/screens/WorkerOnboardingScreen";
import CustomerOnboardingScreen from "./src/screens/CustomerOnboardingScreen";
import PostJobScreen from "./src/screens/PostJobScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import WhatsAppDemoScreen from "./src/screens/WhatsAppDemoScreen";
import PhoneSignupScreen from "./src/screens/PhoneSignupScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RoleSelectionScreen from "./src/screens/RoleSelectionScreen";
import WorkerJobFeedScreen from "./src/screens/WorkerJobFeedScreen";
import FindWorkScreen from "./src/screens/FindWorkScreen";
import ContactSupportScreen from "./src/screens/ContactSupportScreen";
import WorkerMyProfileScreen from "./src/screens/WorkerMyProfileScreen";
import CustomerProfileScreen from "./src/screens/CustomerProfileScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import AdminScreen from "./src/screens/AdminScreen";

function AccountTab(props) {
  const { user } = useAuth();
  return user ? <DashboardScreen {...props} /> : <LoginScreen {...props} />;
}

function WorkOrWorkersTab(props) {
  const { user } = useAuth();
  return user?.role === "worker"
    ? <WorkerJobFeedScreen {...props} />
    : <MarketplaceScreen {...props} />;
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_OPTS = {
  icon: (name) => ({ tabBarIcon: ({ color }) => <Ionicons name={name} size={22} color={color} /> }),
};

function Tabs() {
  const { user } = useAuth();
  const role = user?.role || "guest";

  const sharedOpts = {
    headerShown: false,
    tabBarActiveTintColor: colors.saffron,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.border, height: 64, paddingBottom: 8, paddingTop: 6 },
    tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
  };

  return (
    <Tab.Navigator key={role} screenOptions={sharedOpts}>
      <Tab.Screen name="Home" component={LandingScreen}
        options={{ title: "Home", ...TAB_OPTS.icon("home-outline") }} />

      {/* ── GUEST ──────────────────────────────────────── */}
      {role === "guest" && <>
        <Tab.Screen name="Workers" component={MarketplaceScreen}
          options={{ title: "Find Workers", ...TAB_OPTS.icon("search-outline") }} />
        <Tab.Screen name="Jobs" component={FindWorkScreen}
          options={{ title: "Find Work", ...TAB_OPTS.icon("hammer-outline") }} />
        <Tab.Screen name="Chat" component={WhatsAppDemoScreen}
          options={{ title: "WhatsApp", ...TAB_OPTS.icon("chatbubble-ellipses-outline") }} />
        <Tab.Screen name="Account" component={AccountTab}
          options={{ title: "Log in", ...TAB_OPTS.icon("person-outline") }} />
      </>}

      {/* ── CUSTOMER ───────────────────────────────────── */}
      {role === "customer" && <>
        <Tab.Screen name="Workers" component={MarketplaceScreen}
          options={{ title: "Find Workers", ...TAB_OPTS.icon("search-outline") }} />
        <Tab.Screen name="Calendar" component={CalendarScreen}
          options={{ title: "Schedule", ...TAB_OPTS.icon("calendar-outline") }} />
        <Tab.Screen name="PostJob" component={PostJobScreen}
          options={{ title: "Post a Job", ...TAB_OPTS.icon("add-circle-outline") }} />
        <Tab.Screen name="Account" component={AccountTab}
          options={{ title: "Dashboard", ...TAB_OPTS.icon("apps-outline") }} />
      </>}

      {/* ── WORKER ─────────────────────────────────────── */}
      {role === "worker" && <>
        <Tab.Screen name="Jobs" component={WorkerJobFeedScreen}
          options={{ title: "Find Jobs", ...TAB_OPTS.icon("briefcase-outline") }} />
        <Tab.Screen name="Calendar" component={CalendarScreen}
          options={{ title: "Schedule", ...TAB_OPTS.icon("calendar-outline") }} />
        <Tab.Screen name="Account" component={AccountTab}
          options={{ title: "My Work", ...TAB_OPTS.icon("wallet-outline") }} />
        <Tab.Screen name="MyProfile" component={WorkerMyProfileScreen}
          options={{ title: "My Profile", ...TAB_OPTS.icon("person-circle-outline") }} />
      </>}

      {/* ── ADMIN ──────────────────────────────────────── */}
      {role === "admin" && <>
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ title: "Dashboard", ...TAB_OPTS.icon("shield-checkmark-outline") }} />
      </>}
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
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.indigo,
        headerTitleStyle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
        headerShadowVisible: false,
      }}
    >
      {/* Tab root — no header */}
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

      {/* Auth screens — custom back handled inside, hide native header */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneSignup" component={PhoneSignupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />

      {/* Onboarding — native header gives back arrow + title */}
      <Stack.Screen name="CustomerOnboarding" component={CustomerOnboardingScreen} options={{ title: "Location" }} />
      <Stack.Screen name="WorkerOnboarding" component={WorkerOnboardingScreen} options={{ headerShown: false }} />

      {/* App screens — custom back already inside, hide native */}
      <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostJob" component={PostJobScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

      {/* Feed screens — native header */}
      <Stack.Screen name="WorkerJobFeed" component={WorkerJobFeedScreen} options={{ title: "Jobs Near You" }} />
      <Stack.Screen name="FindWork" component={FindWorkScreen} options={{ title: "Find Work" }} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ title: "Help & Support" }} />
      <Stack.Screen name="WorkerMyProfile" component={WorkerMyProfileScreen} options={{ title: "My Profile" }} />
      <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ title: "My Profile" }} />
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
    <LanguageProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </LanguageProvider>
  );
}
