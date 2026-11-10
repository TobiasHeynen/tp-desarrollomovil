import { Stack } from "expo-router";

//TOBIAS - pantallas de ingreso y registro, con encabezado para poder volver atras
export default function LayoutAuth() {
    return (
        <Stack>
            <Stack.Screen name="login" options={{ title: "Ingresar" }} />
            <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
        </Stack>
    );
}
