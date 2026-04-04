// =============================================================
// Sellix AI — CRM Demo Data + Persistence
// Generates realistic WhatsApp conversations for pharmacy context
// Stores in data/crm/conversations.json
// =============================================================

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Conversation, Order, Payment, ChatMessage, ConversationStage, ConversationStatus } from "./types";

const CRM_DIR = join(process.cwd(), "data", "crm");
const CONVERSATIONS_PATH = join(CRM_DIR, "conversations.json");

// In-memory fallback for serverless (Vercel)
let memoryStore: Conversation[] | null = null;

export async function loadConversations(): Promise<Conversation[]> {
  // Try filesystem first
  try {
    const raw = await readFile(CONVERSATIONS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Return in-memory store if filesystem not available
    return memoryStore ?? [];
  }
}

export async function saveConversations(convs: Conversation[]): Promise<void> {
  // Always update memory
  memoryStore = convs;
  // Try filesystem, silently fail on serverless
  try {
    await mkdir(CRM_DIR, { recursive: true });
    await writeFile(CONVERSATIONS_PATH, JSON.stringify(convs, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (Vercel) — data lives in memory only
  }
}

// ── Demo data generator ────────────────────────────────────────

const NOMBRES = [
  "María López", "Carlos Rodríguez", "Ana Martínez", "Pedro Gómez",
  "Laura Hernández", "Jorge Díaz", "Sofía Ramírez", "Andrés Torres",
  "Valentina Morales", "Diego Castillo", "Camila Vargas", "Luis Mendoza",
  "Isabella Rojas", "Santiago Gutiérrez", "Daniela Flores", "Mateo Ortiz",
  "Lucía Peña", "Sebastián Reyes", "Paula Sánchez", "Nicolás Jiménez",
];

const TELEFONOS = NOMBRES.map((_, i) => `+573${String(100000000 + i * 7341259).slice(0, 9)}`);

const PRODUCTOS_COMUNES = [
  { codigo: "100026309", nombre: "VALSARTAN 160 MG 30 TBS MK", precio: 42000 },
  { codigo: "100001701", nombre: "DICLOFENACO 75 MG 5 AMPOLLAS GF", precio: 6000 },
  { codigo: "100012356", nombre: "LOSARTAN 50 MG 30 TABLETAS", precio: 12000 },
  { codigo: "100008901", nombre: "ACETAMINOFEN 500 MG 100 TBS", precio: 13848 },
  { codigo: "100005502", nombre: "OMEPRAZOL 20 MG 30 CAPSULAS", precio: 8500 },
  { codigo: "100003201", nombre: "METFORMINA 850 MG 30 TABLETAS", precio: 9200 },
  { codigo: "100045201", nombre: "SILDENAFILO 50 MG 10 TABLETAS", precio: 25000 },
  { codigo: "100067301", nombre: "ATORVASTATINA 20 MG 30 TABLETAS", precio: 15000 },
  { codigo: "100089401", nombre: "AZITROMICINA 500 MG 3 TABLETAS", precio: 13679 },
  { codigo: "100023501", nombre: "IBUPROFENO 400 MG 100 TABLETAS", precio: 11000 },
];

function randomId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(8 + Math.random() * 12), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function minutesLater(base: string, mins: number): string {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

type ConversationTemplate = {
  stage: ConversationStage;
  status: ConversationStatus;
  priority: "alta" | "media" | "baja";
  tags: string[];
  messages: Omit<ChatMessage, "id" | "timestamp">[];
  hasOrder: boolean;
  orderPaid: boolean;
};

const CONVERSATION_TEMPLATES: ConversationTemplate[] = [
  // Lead inicial — no respondido
  {
    stage: "lead", status: "no_respondido", priority: "alta", tags: ["nuevo"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Buenas tardes, tienen Losartán 50mg?", type: "text" },
    ],
  },
  {
    stage: "lead", status: "no_respondido", priority: "media", tags: ["nuevo"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Hola, necesito saber si tienen Metformina 850mg y cuánto vale", type: "text" },
    ],
  },
  // Seguimiento — respondido, esperando cliente
  {
    stage: "seguimiento", status: "activo", priority: "media", tags: ["cotización"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Buenos días, cuánto cuesta el Valsartán 160mg?", type: "text" },
      { from: "agente", text: "¡Buenos días! El Valsartán 160mg MK x30 tabletas lo tenemos a $42.000 la caja. Es el mejor precio de la zona. ¿Le separo una?", type: "text" },
      { from: "cliente", text: "Déjame pensarlo, cuánto dura la oferta?", type: "text" },
      { from: "agente", text: "El precio está vigente toda la semana. Si gusta le reservo una caja sin compromiso 😊", type: "text" },
    ],
  },
  {
    stage: "seguimiento", status: "activo", priority: "alta", tags: ["urgente", "receta"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Buenas, me mandaron esta fórmula del médico. Tienen todo?", type: "text" },
      { from: "cliente", text: "📋 Omeprazol 20mg, Azitromicina 500mg x3, Acetaminofén 500mg", type: "text" },
      { from: "agente", text: "¡Buenas! Sí tenemos todo. Le paso la cotización:\n\n• Omeprazol 20mg x30: $8.500\n• Azitromicina 500mg x3: $13.679\n• Acetaminofén 500mg x100: $13.848\n\nTotal: $36.027\n\n¿Se lo enviamos a domicilio?", type: "text" },
    ],
  },
  // Cliente potencial — validando productos/precios
  {
    stage: "potencial", status: "activo", priority: "alta", tags: ["domicilio"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Hola, necesito Atorvastatina 20mg y Losartán 50mg para mi papá. Hacen domicilio?", type: "text" },
      { from: "agente", text: "¡Claro! Sí hacemos domicilio sin costo adicional en Barranquilla.\n\nAtorvastatina 20mg x30: $15.000\nLosartán 50mg x30: $12.000\nTotal: $27.000\n\n¿Le genero el pedido?", type: "text" },
      { from: "cliente", text: "Sí, pero necesito que me manden 2 cajas de cada uno", type: "text" },
      { from: "agente", text: "Perfecto, 2 de cada uno:\n\n2x Atorvastatina: $30.000\n2x Losartán: $24.000\nTotal: $54.000\n\nLe genero el link de pago?", type: "text" },
      { from: "cliente", text: "Sí, mándeme el link", type: "text" },
    ],
  },
  // Venta — con orden y pago
  {
    stage: "venta", status: "pendiente_pago", priority: "alta", tags: ["pedido", "pago_pendiente"],
    hasOrder: true, orderPaid: false,
    messages: [
      { from: "cliente", text: "Hola, necesito Sildenafilo 50mg", type: "text" },
      { from: "agente", text: "Buenos días! Sildenafilo 50mg x10 tabletas: $25.000. ¿Cuántas cajas necesita?", type: "text" },
      { from: "cliente", text: "2 cajas por favor", type: "text" },
      { from: "agente", text: "Listo! Su pedido:\n2x Sildenafilo 50mg x10: $50.000\n\nAquí su link de pago:", type: "text" },
      { from: "sistema", text: "🔗 Link de pago generado: $50.000\nhttps://pay.sellix.ai/demo/ord_xxxx", type: "payment_link" },
      { from: "agente", text: "Cuando realice el pago le confirmo el envío. Estamos atentos!", type: "text" },
    ],
  },
  {
    stage: "venta", status: "activo", priority: "media", tags: ["pedido", "pagado"],
    hasOrder: true, orderPaid: true,
    messages: [
      { from: "cliente", text: "Buenas, necesito Diclofenaco inyectable y Ibuprofeno", type: "text" },
      { from: "agente", text: "Diclofenaco 75mg x5 ampollas: $6.000\nIbuprofeno 400mg x100: $11.000\nTotal: $17.000", type: "text" },
      { from: "cliente", text: "Listo, cómo pago?", type: "text" },
      { from: "sistema", text: "🔗 Link de pago generado: $17.000\nhttps://pay.sellix.ai/demo/ord_yyyy", type: "payment_link" },
      { from: "sistema", text: "✅ Pago confirmado — $17.000 recibidos", type: "text" },
      { from: "agente", text: "Pago recibido! Su pedido está siendo preparado. Le avisamos cuando salga el domicilio. 🏍️", type: "text" },
    ],
  },
  // Postventa
  {
    stage: "postventa", status: "postventa", priority: "baja", tags: ["entregado", "satisfecho"],
    hasOrder: true, orderPaid: true,
    messages: [
      { from: "cliente", text: "Necesito Acetaminofén y Omeprazol", type: "text" },
      { from: "agente", text: "Acetaminofén 500mg x100: $13.848\nOmeprazol 20mg x30: $8.500\nTotal: $22.348", type: "text" },
      { from: "sistema", text: "✅ Pago confirmado — $22.348", type: "text" },
      { from: "agente", text: "Pedido en camino! 🏍️", type: "text" },
      { from: "sistema", text: "📦 Pedido entregado", type: "text" },
      { from: "sistema", text: "Hola! Somos Droguería Super Ofertas. ¿Recibió su pedido correctamente? ¿Necesita algo más?", type: "auto_followup" },
      { from: "cliente", text: "Sí, todo perfecto. Muchas gracias!", type: "text" },
      { from: "sistema", text: "Recuerde que puede hacer su próximo pedido por este mismo chat. ¡Estamos para servirle! 💊", type: "auto_followup" },
    ],
  },
  // Más leads
  {
    stage: "lead", status: "no_respondido", priority: "media", tags: ["nuevo"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Tienen Atorvastatina 40mg?", type: "text" },
    ],
  },
  {
    stage: "seguimiento", status: "activo", priority: "baja", tags: ["consulta"],
    hasOrder: false, orderPaid: false,
    messages: [
      { from: "cliente", text: "Buenas noches, cuál es el horario de atención?", type: "text" },
      { from: "agente", text: "Buenas noches! Nuestro horario es de lunes a sábado de 7am a 9pm y domingos de 8am a 5pm. ¿Necesita algún medicamento?", type: "text" },
    ],
  },
];

function createOrder(conv: Conversation, template: ConversationTemplate): Order | null {
  if (!template.hasOrder) return null;
  const numItems = 1 + Math.floor(Math.random() * 3);
  const items = PRODUCTOS_COMUNES
    .sort(() => Math.random() - 0.5)
    .slice(0, numItems)
    .map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: 1 + Math.floor(Math.random() * 3),
      precio_unidad: p.precio,
      subtotal: p.precio * (1 + Math.floor(Math.random() * 3)),
    }));

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const orderId = `ord_${randomId()}`;

  let payment: Payment | null = null;
  if (template.orderPaid) {
    payment = {
      id: `pay_${randomId()}`,
      orderId,
      amount: total,
      status: "pagado",
      link: `https://pay.sellix.ai/demo/${orderId}`,
      method: "Nequi",
      paidAt: minutesLater(conv.createdAt, 45),
      createdAt: minutesLater(conv.createdAt, 30),
    };
  } else {
    payment = {
      id: `pay_${randomId()}`,
      orderId,
      amount: total,
      status: "pendiente",
      link: `https://pay.sellix.ai/demo/${orderId}`,
      method: null,
      paidAt: null,
      createdAt: minutesLater(conv.createdAt, 20),
    };
  }

  return {
    id: orderId,
    conversationId: conv.id,
    items,
    total,
    status: template.orderPaid
      ? (template.stage === "postventa" ? "entregado" : "pagado")
      : "confirmado",
    payment,
    createdAt: minutesLater(conv.createdAt, 15),
    updatedAt: minutesLater(conv.createdAt, 60),
  };
}

export async function generateDemoData(): Promise<Conversation[]> {
  const conversations: Conversation[] = [];

  for (let i = 0; i < CONVERSATION_TEMPLATES.length; i++) {
    const template = CONVERSATION_TEMPLATES[i];
    const nameIdx = i % NOMBRES.length;
    const createdAt = randomDate(template.stage === "lead" ? 1 : template.stage === "postventa" ? 7 : 3);

    const messages: ChatMessage[] = template.messages.map((m, j) => ({
      ...m,
      id: `msg_${randomId()}_${j}`,
      timestamp: minutesLater(createdAt, j * (3 + Math.floor(Math.random() * 15))),
    }));

    const conv: Conversation = {
      id: `conv_${randomId()}`,
      cliente: {
        nombre: NOMBRES[nameIdx],
        telefono: TELEFONOS[nameIdx],
        cedula: nameIdx < 15 ? `10${40000000 + nameIdx * 123456}` : null,
      },
      stage: template.stage,
      status: template.status,
      priority: template.priority,
      tags: template.tags,
      notes: "",
      messages,
      order: null,
      lastMessageAt: messages[messages.length - 1].timestamp,
      createdAt,
      unread: template.status === "no_respondido" ? messages.filter((m) => m.from === "cliente").length : 0,
      assignedTo: template.stage !== "lead" ? "Admin" : null,
    };

    conv.order = createOrder(conv, template);
    conversations.push(conv);
  }

  // Sort by last message (newest first)
  conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  await saveConversations(conversations);
  return conversations;
}
