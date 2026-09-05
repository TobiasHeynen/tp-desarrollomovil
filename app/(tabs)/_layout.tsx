import { Tabs } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";

// PERSONA B (espacios) + PERSONA C (reservas) + PERSONA A (perfil) se
// reparten estas 4 pestañas. El mapa general (todos los complejos) es
// una pestaña propia porque el PRD pide "ver dónde queda cada complejo
// en el mapa", separado del mapa de un espacio puntual en su ficha.

export default function LayoutTabs() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Espacios",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mis-reservas"
        options={{
          title: "Mis reservas",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
