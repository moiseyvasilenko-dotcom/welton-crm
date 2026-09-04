import { makeId } from "./utils.js?v=7";

const STORAGE_KEY = "welton-crm-v1";
const emptyState = Object.freeze({ clients: [], deals: [], tasks: [] });

function normalize(candidate = {}) {
  return {
    clients: Array.isArray(candidate.clients) ? candidate.clients : [],
    deals: Array.isArray(candidate.deals) ? candidate.deals : [],
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
  };
}

export class CrmStore {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return structuredClone(emptyState);
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  find(type, id) {
    return this.state[`${type}s`].find((item) => item.id === id);
  }

  upsert(type, record, id = null) {
    const collection = `${type}s`;
    if (id) {
      this.state[collection] = this.state[collection].map((item) => item.id === id ? { ...item, ...record } : item);
    } else {
      this.state[collection].unshift({ id: makeId(), ...record, createdAt: new Date().toISOString() });
    }
    this.persist();
  }

  toggleTask(id) {
    const task = this.find("task", id);
    if (!task) return;
    task.done = !task.done;
    this.persist();
  }

  seedDemo() {
    const clientId = makeId();
    const now = new Date().toISOString();
    this.state = {
      clients: [
        { id: clientId, name: "Алия Садыкова", phone: "+7 700 123 45 67", status: "В работе", note: "Интересуется услугой", createdAt: now },
        { id: makeId(), name: "Данияр Ким", phone: "+7 777 555 20 20", status: "Новый", note: "", createdAt: now },
      ],
      deals: [{ id: makeId(), title: "Пакет Standard", amount: "250000", clientId, status: "Переговоры", createdAt: now }],
      tasks: [{ id: makeId(), title: "Позвонить Алие", date: now.slice(0, 10), note: "Уточнить решение", done: false, createdAt: now }],
    };
    this.persist();
  }
}
