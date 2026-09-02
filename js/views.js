import { icon } from "./icons.js?v=4";
import { escapeHtml, formatDate, formatMoney, initials, plural } from "./utils.js?v=4";

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

function hubView(state) {
  const activeDeals = state.deals.filter((deal) => !["Успешно", "Отказ"].includes(deal.status));
  const openTasks = state.tasks.filter((task) => !task.done);
  const total = activeDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
  const allEmpty = !state.clients.length && !state.deals.length && !state.tasks.length;
  let html = `<section class="balance-card"><span>Активные сделки</span><strong>${formatMoney(total)}</strong><small>${activeDeals.length ? plural(activeDeals.length, "сделка", "сделки", "сделок") : "Пока нет сделок"}</small></section>`;
  html += section("Разделы", `<div class="native-list">
    ${rowShell({ leading: `<span class="glyph icon-tile blue">${icon("users")}</span>`, title: "Клиенты", subtitle: plural(state.clients.length, "запись", "записи", "записей"), attrs: `data-go="clients"` })}
    ${rowShell({ leading: `<span class="glyph icon-tile violet">${icon("briefcase")}</span>`, title: "Сделки", subtitle: `${activeDeals.length} в работе из ${state.deals.length}`, attrs: `data-go="deals"` })}
    ${rowShell({ leading: `<span class="glyph icon-tile green">${icon("check-circle")}</span>`, title: "Задачи", subtitle: `${openTasks.length ? plural(openTasks.length, "открытая", "открытые", "открытых") : "все закрыты"}`, attrs: `data-go="tasks"` })}
  </div>`);
  if (allEmpty) return html + section("Начало работы", emptyState("CRM пока пустая"));
  if (openTasks.length) html += section("Ближайшие задачи", taskList(openTasks.slice(0, 3)), `<button class="section-link" type="button" data-go="tasks">Все</button>`);
  if (activeDeals.length) html += section("Активные сделки", dealList(activeDeals.slice(0, 3), state), `<button class="section-link" type="button" data-go="deals">Все</button>`);
  return html;
}

function globalSearch(state, query) {
  const clients = state.clients.filter((item) => matches(query, item.name, item.phone, item.note, item.status));
  const deals = state.deals.filter((item) => matches(query, item.title, item.amount, item.status, state.clients.find((client) => client.id === item.clientId)?.name));
  const tasks = state.tasks.filter((item) => matches(query, item.title, item.note, item.date));
  let html = "";
  if (clients.length) html += section(`Клиенты · ${clients.length}`, clientList(clients));
  if (deals.length) html += section(`Сделки · ${deals.length}`, dealList(deals, state));
  if (tasks.length) html += section(`Задачи · ${tasks.length}`, taskList(tasks));
  return html || `<div class="empty-state"><div class="empty-icon">${icon("search")}</div><h2>Ничего не найдено</h2></div>`;
}

function screenList(listHtml, itemsCount, query, emptyTitle) {
  if (!itemsCount) return emptyState(query ? "Ничего не найдено" : emptyTitle);
  return section(query ? "Результаты" : "Все записи", listHtml);
}

export function renderView(tab, state, query = "") {
  if (tab === "home") return query ? globalSearch(state, query) : hubView(state);
  if (tab === "clients") {
    const items = state.clients.filter((item) => matches(query, item.name, item.phone, item.note, item.status));
    return screenList(clientList(items), items.length, query, "Клиентов нет");
  }
  if (tab === "deals") {
    const items = state.deals.filter((item) => matches(query, item.title, item.amount, item.status, state.clients.find((client) => client.id === item.clientId)?.name));
    return screenList(dealList(items, state), items.length, query, "Сделок нет");
  }
  const items = state.tasks.filter((item) => matches(query, item.title, item.note, item.date));
  return screenList(taskList(items), items.length, query, "Задач нет");
}