/**
 * Nombre comercial con el que firman el bot y los mensajes.
 * Se fija por despliegue con NEXT_PUBLIC_NOMBRE_NEGOCIO (también llega al cliente).
 */
export const NOMBRE_NEGOCIO = process.env.NEXT_PUBLIC_NOMBRE_NEGOCIO ?? "Droguería Demo";
