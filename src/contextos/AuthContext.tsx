import React, { createContext, useContext, useState } from "react";
import { Usuario } from "../tipos";

// PERSONA A: acá va la integración real con expo-secure-store (guardar
// token) y expo-local-authentication (reingreso con huella/rostro).
// Este contexto ya deja la forma que el resto de la app necesita consumir.

interface AuthContextValor {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  iniciarSesion: (usuario: Usuario, token: string) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando] = useState(false);

  // TODO(Persona A): al montar, leer token guardado en expo-secure-store
  // y, si existe, pedir reingreso con expo-local-authentication antes de
  // restaurar la sesión. Mientras tanto `cargando` debería ser true.

  function iniciarSesion(u: Usuario, t: string) {
    setUsuario(u);
    setToken(t);
    // TODO(Persona A): guardar `t` en expo-secure-store acá.
  }

  function cerrarSesion() {
    setUsuario(null);
    setToken(null);
    // TODO(Persona A): borrar el token de expo-secure-store acá.
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
