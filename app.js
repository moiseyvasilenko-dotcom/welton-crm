(() => {
  "use strict";
  const rawTelegram = window.Telegram?.WebApp;
  const tg = rawTelegram?.initData ? rawTelegram : null;
  const STORAGE_KEY = "welton-crm-v1";
  const emptyState = { clients: [], deals: [], tasks: [] };
  let state = loadState();
  let currentTab = "home";
  let query = "";
  let editing = null;

  const $ = (selector) => document.querySelector(selector);
  const content = $("#content");
  const dialog = $("#editorDialog");
  const form = $("#editorForm");

  function loadState() {
    try { return { ...emptyState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return structuredClone(emptyState); }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function id() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
  function esc(value = "") { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
  function money(value) { return new Intl.NumberFormat("ru-RU").format(Number(value) || 0) + " ₸"; }
  function initials(name) { return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "?"; }
  function dateLabel(value) { if (!value) return "Без даты"; return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(value + "T12:00:00")); }
  function matches(...values) { return !query || values.some(v => String(v || "").toLowerCase().includes(query)); }
  function haptic(type = "light") { tg?.HapticFeedback?.impactOccurred(type); }
  function toast(text) { const el = $("#toast"); el.textContent = text; el.hidden = false; setTimeout(() => el.hidden = true, 1700); }

  const labels = { home: "CRM", clients: "Клиенты", deals: "Сделки", tasks: "Задачи" };
  const actions = { home: "Добавить клиента", clients: "Добавить клиента", deals: "Добавить сделку", tasks: "Добавить задачу" };

  function setupTelegram() {
    if (!tg) return;
    document.body.classList.add("telegram");
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("secondary_bg_color");
    tg.setBackgroundColor?.("bg_color");
    tg.MainButton.onClick(openEditorForTab);
    tg.MainButton.show();
  }

  function updateMainButton() {
    const text = actions[currentTab];
    $("#fallbackMainButton").textContent = text;
    tg?.MainButton?.setParams({ text, is_active: true, is_visible: true });
  }

  function switchTab(tab) {
    currentTab = tab;
    $("#pageTitle").textContent = labels[tab];
    document.querySelectorAll(".tab").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
    updateMainButton();
    render();
    haptic();
  }

  function section(title, body, action = "") {
    return `<div class="section-title"><h2>${esc(title)}</h2>${action}</div>${body}`;
  }
  function empty(symbol, title, text) {
    return `<div class="empty"><div class="symbol">${symbol}</div><h2>${esc(title)}</h2><p>${esc(text)}</p><button type="button" data-action="demo">Добавить демо-данные</button></div>`;
  }
  function clientRows(items) {
    return `<div class="list">${items.map(c => `<div class="row" data-edit="client" data-id="${c.id}"><div class="avatar">${esc(initials(c.name))}</div><div class="row-main"><strong>${esc(c.name)}</strong><span>${esc(c.phone || c.note || "Без контакта")}</span></div><div class="row-side"><span class="badge">${esc(c.status || "Новый")}</span></div></div>`).join("")}</div>`;
  }
  function dealRows(items) {
    return `<div class="list">${items.map(d => { const client = state.clients.find(c => c.id === d.clientId); return `<div class="row" data-edit="deal" data-id="${d.id}"><div class="avatar">₸</div><div class="row-main"><strong>${esc(d.title)}</strong><span>${esc(client?.name || "Без клиента")}</span></div><div class="row-side"><strong>${money(d.amount)}</strong><small class="badge ${d.status === "Успешно" ? "green" : d.status === "Переговоры" ? "amber" : ""}">${esc(d.status)}</small></div></div>`; }).join("")}</div>`;
  }
  function taskRows(items) {
    return `<div class="list">${items.map(t => `<div class="row ${t.done ? "task-done" : ""}"><button class="task-check ${t.done ? "done" : ""}" data-check="${t.id}" aria-label="Отметить задачу">✓</button><div class="row-main" data-edit="task" data-id="${t.id}"><strong>${esc(t.title)}</strong><span>${esc(t.note || "Без описания")}</span></div><div class="row-side"><small>${dateLabel(t.date)}</small></div></div>`).join("")}</div>`;
  }

  function renderHome() {
    const activeDeals = state.deals.filter(d => d.status !== "Успешно" && d.status !== "Отказ");
    const openTasks = state.tasks.filter(t => !t.done);
    const total = activeDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    let html = `<div class="summary-grid"><div class="summary-card"><strong>${state.clients.length}</strong><span>клиентов</span></div><div class="summary-card"><strong>${activeDeals.length}</strong><span>сделок</span></div><div class="summary-card"><strong>${openTasks.length}</strong><span>задач</span></div></div>`;
    html += `<div class="summary-card"><span>Сумма активных сделок</span><strong>${money(total)}</strong></div>`;
    if (!state.clients.length && !state.deals.length && !state.tasks.length) return html + section("Начало работы", empty("◎", "CRM пока пустая", "Добавьте первого клиента или загрузите демо-данные."));
    if (openTasks.length) html += section("Ближайшие задачи", taskRows(openTasks.slice(0, 4)), `<button type="button" data-go="tasks">Все</button>`);
    if (activeDeals.length) html += section("Активные сделки", dealRows(activeDeals.slice(0, 4)), `<button type="button" data-go="deals">Все</button>`);
    return html;
  }

  function render() {
    if (currentTab === "home") content.innerHTML = renderHome();
    if (currentTab === "clients") { const items = state.clients.filter(c => matches(c.name, c.phone, c.note, c.status)); content.innerHTML = items.length ? clientRows(items) : empty("♙", "Клиентов нет", query ? "Ничего не найдено." : "Добавьте первого клиента."); }
    if (currentTab === "deals") { const items = state.deals.filter(d => matches(d.title, d.amount, d.status, state.clients.find(c => c.id === d.clientId)?.name)); content.innerHTML = items.length ? dealRows(items) : empty("◫", "Сделок нет", query ? "Ничего не найдено." : "Создайте первую сделку."); }
    if (currentTab === "tasks") { const items = state.tasks.filter(t => matches(t.title, t.note, t.date)); content.innerHTML = items.length ? taskRows(items) : empty("✓", "Задач нет", query ? "Ничего не найдено." : "Добавьте первую задачу."); }
  }

  function field(label, name, type = "text", value = "", extra = "") {
    return `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  }
  function selectField(label, name, options, selected = "") {
    return `<label class="field"><span>${esc(label)}</span><select name="${name}">${options.map(([value, text]) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></label>`;
  }

  function openEditor(type, record = null) {
    editing = { type, id: record?.id || null };
    $("#dialogTitle").textContent = record ? "Редактирование" : ({ client: "Новый клиент", deal: "Новая сделка", task: "Новая задача" }[type]);
    let fields = "";
    if (type === "client") fields = field("Имя *", "name", "text", record?.name, "required") + field("Телефон", "phone", "tel", record?.phone) + selectField("Статус", "status", [["Новый", "Новый"], ["В работе", "В работе"], ["Постоянный", "Постоянный"]], record?.status || "Новый") + `<label class="field"><span>Заметка</span><textarea name="note">${esc(record?.note)}</textarea></label>`;
    if (type === "deal") fields = field("Название *", "title", "text", record?.title, "required") + field("Сумма", "amount", "number", record?.amount, 'min="0" inputmode="numeric"') + selectField("Клиент", "clientId", [["", "Без клиента"], ...state.clients.map(c => [c.id, c.name])], record?.clientId || "") + selectField("Этап", "status", [["Новая", "Новая"], ["Переговоры", "Переговоры"], ["Успешно", "Успешно"], ["Отказ", "Отказ"]], record?.status || "Новая");
    if (type === "task") fields = field("Задача *", "title", "text", record?.title, "required") + field("Срок", "date", "date", record?.date) + `<label class="field"><span>Комментарий</span><textarea name="note">${esc(record?.note)}</textarea></label>`;
    $("#formFields").innerHTML = fields;
    dialog.showModal();
    tg?.MainButton?.hide();
    tg?.BackButton?.show();
    haptic("medium");
  }

  function closeEditor() {
    if (dialog.open) dialog.close();
    editing = null;
    tg?.BackButton?.hide();
    tg?.MainButton?.show();
  }
  function openEditorForTab() { openEditor(currentTab === "deals" ? "deal" : currentTab === "tasks" ? "task" : "client"); }

  function upsert(formData) {
    const type = editing.type;
    const listName = type + "s";
    const data = Object.fromEntries(formData.entries());
    if (type === "task") data.done = editing.id ? Boolean(state.tasks.find(x => x.id === editing.id)?.done) : false;
    if (editing.id) state[listName] = state[listName].map(x => x.id === editing.id ? { ...x, ...data } : x);
    else state[listName].unshift({ id: id(), ...data, createdAt: new Date().toISOString() });
    saveState(); render(); closeEditor(); toast("Сохранено"); haptic("medium");
  }

  function addDemo() {
    const c1 = { id: id(), name: "Алия Садыкова", phone: "+7 700 123 45 67", status: "В работе", note: "Интересуется услугой", createdAt: new Date().toISOString() };
    const c2 = { id: id(), name: "Данияр Ким", phone: "+7 777 555 20 20", status: "Новый", note: "", createdAt: new Date().toISOString() };
    state.clients = [c1, c2];
    state.deals = [{ id: id(), title: "Пакет Standard", amount: "250000", clientId: c1.id, status: "Переговоры", createdAt: new Date().toISOString() }];
    state.tasks = [{ id: id(), title: "Позвонить Алие", date: new Date().toISOString().slice(0, 10), note: "Уточнить решение", done: false, createdAt: new Date().toISOString() }];
    saveState(); render(); toast("Демо-данные добавлены");
  }

  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  $("#fallbackMainButton").addEventListener("click", openEditorForTab);
  $("#searchToggle").addEventListener("click", () => { const panel = $("#searchPanel"); panel.hidden = !panel.hidden; if (!panel.hidden) $("#searchInput").focus(); });
  $("#searchInput").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });
  content.addEventListener("click", e => {
    const go = e.target.closest("[data-go]"); if (go) return switchTab(go.dataset.go);
    if (e.target.closest("[data-action=demo]")) return addDemo();
    const check = e.target.closest("[data-check]"); if (check) { const task = state.tasks.find(t => t.id === check.dataset.check); if (task) { task.done = !task.done; saveState(); render(); haptic(); } return; }
    const target = e.target.closest("[data-edit]"); if (target) { const list = state[target.dataset.edit + "s"]; openEditor(target.dataset.edit, list.find(x => x.id === target.dataset.id)); }
  });
  form.addEventListener("submit", e => { e.preventDefault(); if (!form.reportValidity()) return; upsert(new FormData(form)); });
  dialog.addEventListener("close", () => { tg?.BackButton?.hide(); tg?.MainButton?.show(); });
  tg?.BackButton?.onClick(closeEditor);
  setupTelegram(); updateMainButton(); render();
})();
