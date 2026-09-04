import { editorTemplate } from "./js/forms.js?v=7";
import { mountStaticIcons } from "./js/icons.js?v=7";
import { CrmStore } from "./js/store.js?v=7";
import { TelegramBridge } from "./js/telegram.js?v=7";
import { renderView } from "./js/views.js?v=7";

const labels = { home: "Обзор", clients: "Клиенты", deals: "Сделки", tasks: "Задачи" };
const typeForTab = { home: "client", clients: "client", deals: "deal", tasks: "task" };
const editorTitles = {
  client: ["Новый клиент", "Клиент"],
  deal: ["Новая сделка", "Сделка"],
  task: ["Новая задача", "Задача"],
};

const store = new CrmStore();
const telegram = new TelegramBridge();
const elements = {
  content: document.querySelector("#content"),
  pageTitle: document.querySelector("#pageTitle"),
  searchToggle: document.querySelector("#searchToggle"),
  searchPanel: document.querySelector("#searchPanel"),
  searchInput: document.querySelector("#searchInput"),
  clearSearch: document.querySelector("#clearSearch"),
  fallbackMain: document.querySelector("#fallbackMainButton"),
  dialog: document.querySelector("#editorDialog"),
  form: document.querySelector("#editorForm"),
  formFields: document.querySelector("#formFields"),
  dialogTitle: document.querySelector("#dialogTitle"),
  cancelEditor: document.querySelector("#cancelEditor"),
  toast: document.querySelector("#toast"),
};

let currentTab = "home";
let query = "";
let editing = null;
let toastTimer = null;

function render() {
  elements.pageTitle.textContent = labels[currentTab];
  elements.content.innerHTML = renderView(currentTab, store.state, query);
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === currentTab));
  updateMainAction();
}

function updateMainAction() {
  if (editing) telegram.setMain("Сохранить", true);
  else telegram.setMain("", false);
}

function switchTab(tab) {
  if (!labels[tab] || tab === currentTab) return;
  currentTab = tab;
  closeSearch(false);
  render();
  telegram.selection();
}

function openSearch() {
  elements.searchPanel.hidden = false;
  elements.searchToggle.hidden = true;
  telegram.showBack(true);
  requestAnimationFrame(() => elements.searchInput.focus());
}

function closeSearch(shouldRender = true) {
  query = "";
  elements.searchInput.value = "";
  elements.clearSearch.hidden = true;
  elements.searchPanel.hidden = true;
  elements.searchToggle.hidden = false;
  if (!editing) telegram.showBack(false);
  if (shouldRender) render();
}

function openEditor(type, record = null) {
  editing = { type, id: record?.id || null };
  elements.dialogTitle.textContent = editorTitles[type][record ? 1 : 0];
  elements.formFields.innerHTML = editorTemplate(type, record, store.state.clients);
  elements.dialog.showModal();
  elements.fallbackMain.hidden = true;
  telegram.showBack(true);
  telegram.setMain("Сохранить", true);
  telegram.impact("medium");
  requestAnimationFrame(() => elements.form.querySelector("input")?.focus());
}

function closeEditor() {
  if (elements.dialog.open) elements.dialog.close();
  editing = null;
  elements.fallbackMain.hidden = false;
  telegram.showBack(!elements.searchPanel.hidden);
  updateMainAction();
}

function openEditorForCurrentTab() {
  openEditor(typeForTab[currentTab]);
}

function handleMainAction() {
  if (editing) elements.form.requestSubmit();
  else openEditorForCurrentTab();
}

function handleBackAction() {
  if (editing) closeEditor();
  else if (!elements.searchPanel.hidden) closeSearch();
}

function saveEditor() {
  if (!editing || !elements.form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(elements.form).entries());
  if (editing.type === "task") data.done = editing.id ? Boolean(store.find("task", editing.id)?.done) : false;
  store.upsert(editing.type, data, editing.id);
  closeEditor();
  render();
  showToast("Сохранено");
  telegram.success();
}

function showToast(text) {
  clearTimeout(toastTimer);
  elements.toast.textContent = text;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 1700);
}

function editFromElement(target) {
  const type = target.dataset.edit;
  const record = store.find(type, target.dataset.id);
  if (record) openEditor(type, record);
}

function handleContentClick(event) {
  const go = event.target.closest("[data-go]");
  if (go) return switchTab(go.dataset.go);

  if (event.target.closest("[data-action='demo']")) {
    store.seedDemo();
    render();
    showToast("Концепт заполнен");
    telegram.success();
    return;
  }

  const toggle = event.target.closest("[data-check]");
  if (toggle) {
    store.toggleTask(toggle.dataset.check);
    render();
    telegram.impact("light");
    return;
  }

  const editable = event.target.closest("[data-edit]");
  if (editable) editFromElement(editable);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  elements.fallbackMain.addEventListener("click", openEditorForCurrentTab);
  elements.searchToggle.addEventListener("click", openSearch);
  elements.clearSearch.addEventListener("click", () => {
    elements.searchInput.value = "";
    query = "";
    elements.clearSearch.hidden = true;
    elements.searchInput.focus();
    render();
  });
  elements.searchInput.addEventListener("input", (event) => {
    query = event.target.value.trim().toLowerCase();
    elements.clearSearch.hidden = !query;
    render();
  });
  elements.content.addEventListener("click", handleContentClick);
  elements.cancelEditor.addEventListener("click", closeEditor);
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditor();
  });
  elements.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEditor();
  });
  elements.dialog.addEventListener("close", () => {
    if (editing) {
      editing = null;
      telegram.showBack(!elements.searchPanel.hidden);
      updateMainAction();
    }
  });
}

function boot() {
  try {
    mountStaticIcons();
    bindEvents();
    telegram.init({ onMain: handleMainAction, onBack: handleBackAction });
    render();
  } catch (error) {
    console.error("Welton CRM failed to start", error);
    elements.content.innerHTML = '<div class="empty-state"><h2>Не удалось открыть CRM</h2><p>Закройте и снова откройте приложение.</p></div>';
  }
}

boot();
