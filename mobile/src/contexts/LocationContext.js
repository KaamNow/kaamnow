import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";

const STORE_KEY = "kn_selected_location";

const LocationContext = createContext({
  location: null,        // { pincode, label, lat, lng }
  setLocation: () => {},
  clearLocation: () => {},
  detectGPS: async () => {},
  gpsLoading: false,
});

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Restore last selected location on mount
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then(raw => { if (raw) setLocationState(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const setLocation = useCallback((loc) => {
    setLocationState(loc);
    if (loc) SecureStore.setItemAsync(STORE_KEY, JSON.stringify(loc)).catch(() => {});
    else SecureStore.deleteItemAsync(STORE_KEY).catch(() => {});
  }, []);

  const clearLocation = useCallback(() => setLocation(null), [setLocation]);

  const detectGPS = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return { error: "permission_denied" };

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;

      // Reverse geocode to get pincode via Indian postal API
      try {
        // Try expo reverse geocode for area name
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const label = [geo?.district || geo?.city || geo?.subregion, geo?.region]
          .filter(Boolean).join(", ");
        setLocation({ pincode: geo?.postalCode || "", label: label || "Current location", lat, lng });
        return { lat, lng, label };
      } catch {
        setLocation({ pincode: "", label: "Current location", lat, lng });
        return { lat, lng };
      }
    } catch {
      return { error: "failed" };
    } finally {
      setGpsLoading(false);
    }
  }, [setLocation]);

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation, detectGPS, gpsLoading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  return useContext(LocationContext);
}
