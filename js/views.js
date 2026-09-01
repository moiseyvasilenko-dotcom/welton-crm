import { icon } from "./icons.js";
import { escapeHtml, formatDate, formatMoney, initials } from "./utils.js";

function section(title, content, action = "") {
  return `<section class="content-section"><header class="section-head"><h2>${escapeHtml(title)}</h2>${action}</header>${content}</section>`;
}

function emptyState(title) {
  return `<div class="empty-state"><div class="empty-icon">${icon("inbox")}</div><h2>${escapeHtml(title)}</h2></div>`;
}

function statusClass(status) {
  if (["Успешно", "Постоянный"].includes(status)) return "success";
  if (["Переговоры", "В работе"].includes(status)) return "warning";
  if (status === "Отказ") return "danger";
  return "accent";
}

function rowShell({ leading, title, subtitle, trailing = "", attrs = "", extraClass = "" }) {
  return `<button class="native-row ${extraClass}" type="button" ${attrs}><span class="row-leading">${leading}</span><span class="row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></span>${trailing}<span class="row-chevron">${icon("chevron")}</span></button>`;
}

export function clientList(items) {
  return `<div class="native-list">${items.map((client, index) => rowShell({
    leading: `<span class="avatar hue-${index % 5}">${escapeHtml(initials(client.name))}</span>`,
    title: client.name,
    subtitle: client.phone || client.note || "Контакт не указан",
    trailing: `<span class="status ${statusClass(client.status)}">${escapeHtml(client.status || "Новый")}</span>`,
    attrs: `data-edit="client" data-id="${client.id}"`,
  })).join("")}</div>`;
}

export function dealList(items, state) {
  return `<div class="native-list">${items.map((deal) => {
    const client = state.clients.find((item) => item.id === deal.clientId);
    return rowShell({
      leading: `<span class="glyph accent-bg">${icon("wallet")}</span>`,
      title: deal.title,
      subtitle: client?.name || "Без клиента",
      trailing: `<span class="row-value"><strong>${formatMoney(deal.amount)}</strong><span class="status ${statusClass(deal.status)}">${escapeHtml(deal.status)}</span></span>`,
      attrs: `data-edit="deal" data-id="${deal.id}"`,
    });
  }).join("")}</div>`;
}

export function taskList(items) {
  return `<div class="native-list">${items.map((task) => `<div class="native-row task-row ${task.done ? "is-done" : ""}"><button class="task-toggle" type="button" data-check="${task.id}" aria-label="Изменить статус задачи">${task.done ? icon("check") : ""}</button><button class="task-body" type="button" data-edit="task" data-id="${task.id}"><span class="row-copy"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.note || "Без комментария")}</span></span><span class="task-date">${icon("calendar")} ${escapeHtml(formatDate(task.date))}</span><span class="row-chevron">${icon("chevron")}</span></button></div>`).join("")}</div>`;
}

function matches(query, ...values) {
  return !query || values.some((value) => String(value || "").toLowerCase().includes(query));
}

function homeView(state) {
  const activeDeals = state.deals.filter((deal) => !["Успешно", "Отказ"].includes(deal.status));
  const openTasks = state.tasks.filter((task) => !task.done);
  const total = activeDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
  const allEmpty = !state.clients.length && !state.deals.length && !state.tasks.length;
  let html = `<section class="metrics"><button type="button" data-go="clients"><span class="metric-icon blue">${icon("users")}</span><strong>${state.clients.length}</strong><span>Клиенты</span></button><button type="button" data-go="deals"><span class="metric-icon violet">${icon("briefcase")}</span><strong>${activeDeals.length}</strong><span>В работе</span></button><button type="button" data-go="tasks"><span class="metric-icon green">${icon("check-circle")}</span><strong>${openTasks.length}</strong><span>Задачи</span></button></section>`;
  html += `<section class="balance-card"><span>Активные сделки</span><strong>${formatMoney(total)}</strong><small>${activeDeals.length ? `${activeDeals.length} ${activeDeals.length === 1 ? "сделка" : "сделки"}` : "Пока нет сделок"}</small></section>`;
  if (allEmpty) return html + section("Начало работы", emptyState("CRM пока пустая"));
  if (openTasks.length) html += section("Ближайшие задачи", taskList(openTasks.slice(0, 3)), '<button class="section-link" type="button" data-go="tasks">Все</button>');
  if (activeDeals.length) html += section("Активные сделки", dealList(activeDeals.slice(0, 3), state), '<button class="section-link" type="button" data-go="deals">Все</button>');
  return html;
}

export function renderView(tab, state, query = "") {
  if (tab === "home") return homeView(state);
  if (tab === "clients") {
    const items = state.clients.filter((item) => matches(query, item.name, item.phone, item.note, item.status));
    return items.length ? section("Все клиенты", clientList(items)) : emptyState(query ? "Ничего не найдено" : "Клиентов нет");
  }
  if (tab === "deals") {
    const items = state.deals.filter((item) => matches(query, item.title, item.amount, item.status, state.clients.find((client) => client.id === item.clientId)?.name));
    return items.length ? section("Все сделки", dealList(items, state)) : emptyState(query ? "Ничего не найдено" : "Сделок нет");
  }
  const items = state.tasks.filter((item) => matches(query, item.title, item.note, item.date));
  return items.length ? section("Все задачи", taskList(items)) : emptyState(query ? "Ничего не найдено" : "Задач нет");
}
