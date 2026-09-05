import { Usuario } from "../tipos";

export const USUARIOS: Usuario[] = [
  {
    id: "usr-207",
    nombre: "Emiliano Ruiz",
    email: "emiliano@mail.com",
    telefono: "3455-401122",
    rol: "jugador",
    espaciosFavoritos: ["esp-02"],
    cancelacionesTardias: 1,
    ausencias: 0,
  },
  {
    id: "usr-300",
    nombre: "Marcelo Benítez",
    email: "marcelo@villaguay.gob.ar",
    telefono: "3455-500111",
    rol: "encargado",
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0,
  },
  {
    id: "usr-001",
    nombre: "Nahuel Ojeda",
    email: "nahuel@villaguay.gob.ar",
    telefono: "3455-500000",
    rol: "administrador",
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0,
  },
];
