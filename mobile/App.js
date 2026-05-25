import "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, Image, Animated, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  useFonts as useManrope,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { LocationProvider } from "./src/contexts/LocationContext";
import { useTranslation } from "./src/i18n";
import { colors, fonts } from "./src/theme";

// ── Screens ────────────────────────────────────────────────────────────────
import LandingScreen          from "./src/screens/LandingScreen";
import LoginScreen            from "./src/screens/LoginScreen";
import PhoneSignupScreen      from "./src/screens/PhoneSignupScreen";
import MarketplaceScreen      from "./src/screens/MarketplaceScreen";
import WorkerProfileScreen    from "./src/screens/WorkerProfileScreen";
import PostJobScreen          from "./src/screens/PostJobScreen";
import DashboardScreen        from "./src/screens/DashboardScreen";
import ChatsListScreen        from "./src/screens/ChatsListScreen";
import WorkerJobFeedScreen    from "./src/screens/WorkerJobFeedScreen";
import FindWorkScreen         from "./src/screens/FindWorkScreen";
import ContactSupportScreen   from "./src/screens/ContactSupportScreen";
import CalendarScreen         from "./src/screens/CalendarScreen";
import AdminScreen            from "./src/screens/AdminScreen";
import WhatsAppDemoScreen     from "./src/screens/WhatsAppDemoScreen";
import ProfileScreen          from "./src/screens/ProfileScreen";

// ── New screens (Phase 3B) ─────────────────────────────────────────────────
import EngagementDetailScreen from "./src/screens/EngagementDetailScreen";
import ChatScreen             from "./src/screens/ChatScreen";
import NotificationsScreen    from "./src/screens/NotificationsScreen";
import EarningsScreen         from "./src/screens/EarningsScreen";
import WalletScreen           from "./src/screens/WalletScreen";
import FAQScreen              from "./src/screens/FAQScreen";
import TermsScreen            from "./src/screens/TermsScreen";
import PrivacyScreen          from "./src/screens/PrivacyScreen";
import SupportChatScreen      from "./src/screens/SupportChatScreen";
import MapScreen              from "./src/screens/MapScreen";
import QRCodeScreen           from "./src/screens/QRCodeScreen";
import ActivityScreen         from "./src/screens/ActivityScreen";
import SavedExpertsScreen     from "./src/screens/SavedExpertsScreen";
import SavedAddressesScreen   from "./src/screens/SavedAddressesScreen";
import AddressFormScreen      from "./src/screens/AddressFormScreen";
import EmergencyContactScreen from "./src/screens/EmergencyContactScreen";
import EditPhotoScreen        from "./src/screens/EditPhotoScreen";
import EditProfileScreen      from "./src/screens/EditProfileScreen";
import BecomeExpertScreen     from "./src/screens/BecomeExpertScreen";
import PortfolioScreen        from "./src/screens/PortfolioScreen";
import CertificationsScreen   from "./src/screens/CertificationsScreen";
import VideoProfileScreen     from "./src/screens/VideoProfileScreen";
import KYCScreen              from "./src/screens/KYCScreen";
import JobDetailScreen        from "./src/screens/JobDetailScreen";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.2,
});

// ── Deep link config ───────────────────────────────────────────────────────
const linking = {
  prefixes: ["kaamnow://"],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home:       "home",
          PostJobTab: "post-job",
          Profile:    "profile",
        },
      },
      EngagementDetail: "engagement/:id",
      Chat:             "chat/:engagementId",
      Notifications:    "notifications",
    },
  },
};

// ── Animated splash ────────────────────────────────────────────────────────
function AnimatedSplash({ onDone }) {
  const scale  = useRef(new Animated.Value(0.6)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const tagOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(textOp, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(tagOp,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1200),
    ]).start(() => onDone?.());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ transform: [{ scale }], opacity: logoOp }}>
        <Image
          source={require("./assets/icon.png")}
          style={{ width: 100, height: 100, borderRadius: 24 }}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: textOp, marginTop: 24, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>
          Kaam<Text style={{ color: colors.primaryFixed }}>Now</Text>
          <Text style={{ color: colors.primaryFixed, fontSize: 20, fontWeight: "700" }}>.com</Text>
        </Text>
      </Animated.View>
      <Animated.Text style={{ opacity: tagOp, marginTop: 10, color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "500", letterSpacing: 0.3 }}>
        काम की बात, KaamNow के साथ
      </Animated.Text>
    </View>
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const tabIcon = (name) => ({ tabBarIcon: ({ color }) => <Ionicons name={name} size={22} color={color} /> });

// Custom bottom bar — matches HTML exactly: h-20, rounded-t-xl, elevated FAB
function LoggedInTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const idx = state.index; // 0=Home, 1=PostJobTab, 2=Profile

  const tabBtn = (label, iconActive, iconInactive, screenName, tabIdx) => (
    <TouchableOpacity
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      onPress={() => navigation.navigate(screenName)}
      activeOpacity={0.7}
    >
      <Ionicons name={idx === tabIdx ? iconActive : iconInactive} size={24} color={idx === tabIdx ? colors.primary : colors.outline} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: idx === tabIdx ? colors.primary : colors.outline, marginTop: 3 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: 80 + insets.bottom,
      backgroundColor: "#fff",
      borderTopLeftRadius: 12, borderTopRightRadius: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06, shadowRadius: 20, elevation: 16,
      paddingBottom: insets.bottom,
    }}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 24 }}>
        {tabBtn("Home", "home", "home-outline", "Home", 0)}

        {/* Center FAB — elevated -top-8 */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("PostJobFull")}
            activeOpacity={0.85}
            style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: "#1a1c2e",
              alignItems: "center", justifyContent: "center",
              marginBottom: 4,
              position: "relative", top: -24,
              borderWidth: 4, borderColor: "#fff",
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
            }}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, marginTop: -20 }}>
            Post a Job
          </Text>
        </View>

        {tabBtn("Profile", "person-circle", "person-circle-outline", "Profile", 2)}
      </View>
    </View>
  );
}

function Tabs() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = !!user;

  const sharedOpts = {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.outline,
    tabBarStyle: {
      backgroundColor: colors.surfaceCard,
      borderTopColor: colors.borderSubtle,
      height: 64 + insets.bottom,
      paddingBottom: 8 + insets.bottom,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
  };

  if (!isLoggedIn) {
    return (
      <Tab.Navigator screenOptions={sharedOpts}>
        <Tab.Screen name="Home"     component={LandingScreen}     options={{ title: t("nav_home"),      ...tabIcon("home-outline") }} />
        <Tab.Screen name="Browse"   component={MarketplaceScreen}  options={{ title: t("nav_browse"),    ...tabIcon("search-outline") }} />
        <Tab.Screen name="FindWork" component={FindWorkScreen}    options={{ title: t("nav_find_work"), ...tabIcon("hammer-outline") }} />
        <Tab.Screen name="Login"    component={LoginScreen}       options={{ title: t("nav_login"),     ...tabIcon("person-outline") }} />
      </Tab.Navigator>
    );
  }

  // Logged-in: 3-tab nav with custom bottom bar
  return (
    <Tab.Navigator
      tabBar={(props) => <LoggedInTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"       component={DashboardScreen} />
      <Tab.Screen name="PostJobTab" component={PostJobScreen}   />
      <Tab.Screen name="Profile"    component={ProfileScreen}   />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  if (user === undefined) {
    return <View style={{ flex: 1, backgroundColor: colors.primary }} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.surfaceCard },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
        headerShadowVisible: false,
      }}
    >
      {/* ── Tab root ────────────────────────────────────── */}
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />

      {/* ── Auth ────────────────────────────────────────── */}
      <Stack.Screen name="Login"      component={LoginScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="PhoneSignup" component={PhoneSignupScreen} options={{ headerShown: false }} />

      {/* ── Engagement ──────────────────────────────────── */}
      <Stack.Screen name="EngagementDetail" component={EngagementDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat"             component={ChatScreen}             options={{ headerShown: false }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}    options={{ headerShown: false }} />

      {/* ── Worker marketplace ──────────────────────────── */}
      <Stack.Screen name="WorkerProfile"    component={WorkerProfileScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="Marketplace"      component={MarketplaceScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Map"              component={MapScreen}             options={{ title: "Workers Near You" }} />

      {/* ── Profile sub-screens ─────────────────────────── */}
      <Stack.Screen name="EditProfile"      component={EditProfileScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="EditPhoto"        component={EditPhotoScreen}        options={{ title: "Change Photo" }} />
      <Stack.Screen name="BecomeExpert"     component={BecomeExpertScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Portfolio"        component={PortfolioScreen}        options={{ title: "My Portfolio" }} />
      <Stack.Screen name="Certifications"   component={CertificationsScreen}   options={{ title: "Certifications" }} />
      <Stack.Screen name="VideoProfile"     component={VideoProfileScreen}     options={{ title: "Video Profile" }} />
      <Stack.Screen name="KYC"              component={KYCScreen}              options={{ title: "Verify Identity" }} />
      <Stack.Screen name="Earnings"         component={EarningsScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="QRCode"           component={QRCodeScreen}           options={{ title: "My QR Code" }} />
      <Stack.Screen name="Activity"         component={ActivityScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="JobDetail"        component={JobDetailScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="SavedExperts"     component={SavedExpertsScreen}     options={{ title: "Saved Local Experts" }} />
      <Stack.Screen name="SavedAddresses"   component={SavedAddressesScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="AddressForm"      component={AddressFormScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Wallet"           component={WalletScreen}           options={{ headerShown: false }} />

      {/* ── Info screens ────────────────────────────────── */}
      <Stack.Screen name="FAQ"         component={FAQScreen}         options={{ title: "Help & FAQ" }} />
      <Stack.Screen name="Terms"       component={TermsScreen}       options={{ title: "Terms of Service" }} />
      <Stack.Screen name="Privacy"     component={PrivacyScreen}     options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} options={{ title: "Chat with Us" }} />

      {/* ── Misc ────────────────────────────────────────── */}
      <Stack.Screen name="PostJob"        component={PostJobScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="PostJobFull"    component={PostJobScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="WorkerJobFeed"  component={WorkerJobFeedScreen} options={{ title: "Jobs Near You" }} />
      <Stack.Screen name="FindWork"       component={FindWorkScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ title: "Help & Support" }} />
      <Stack.Screen name="ChatsList"      component={ChatsListScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Calendar"       component={CalendarScreen}      options={{ title: "Schedule" }} />
      <Stack.Screen name="Admin"          component={AdminScreen}         options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default Sentry.wrap(function App() {
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [manropeLoaded] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [splashDone, setSplashDone] = useState(false);

  const fontsLoaded = interLoaded && manropeLoaded;
  const ready = fontsLoaded && splashDone;

  return (
    <LanguageProvider>
      <AuthProvider>
        <LocationProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="light" backgroundColor={colors.primary} />
            <RootNavigator />
          </NavigationContainer>
          {!ready && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <AnimatedSplash onDone={() => setSplashDone(true)} />
            </View>
          )}
        </LocationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
});
