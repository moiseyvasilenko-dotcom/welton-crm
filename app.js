import { editorTemplate } from "./js/forms.js?v=4";
import { mountStaticIcons } from "./js/icons.js?v=4";
import { CrmStore } from "./js/store.js?v=4";
import { TelegramBridge } from "./js/telegram.js?v=4";
import { renderView } from "./js/views.js?v=4";

const screens = { home: "Обзор", clients: "Клиенты", deals: "Сделки", tasks: "Задачи" };
const actions = { clients: "Добавить клиента", deals: "Добавить сделку", tasks: "Добавить задачу" };
const typeForScreen = { clients: "client", deals: "deal", tasks: "task" };
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
  backButton: document.querySelector("#backButton"),
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

let screen = "home";
let query = "";
let editing = null;
let toastTimer = null;

function render() {
  elements.pageTitle.textContent = screens[screen];
  elements.content.innerHTML = renderView(screen, store.state, query);
  updateTopbar();
}

function updateTopbar() {
  const action = editing ? null : actions[screen] || null;
  const showBack = Boolean(editing) || screen !== "home" || !elements.searchPanel.hidden;
  elements.backButton.hidden = !showBack;
  telegram.showBack(showBack);
  if (editing) telegram.setMain("Сохранить", true);
  else if (action) telegram.setMain(action, true);
  else telegram.setMain("", false);
  if (action) {
    elements.fallbackMain.lastElementChild.textContent = action;
    elements.fallbackMain.hidden = false;
  } else {
    elements.fallbackMain.hidden = true;
  }
}

function openScreen(next) {
  if (!screens[next] || next === screen) return;
  screen = next;
  closeSearch(false);
  render();
  telegram.selection();
}

function goHome() {
  if (screen !== "home") return openScreen("home");
  closeSearch();
}

function openSearch() {
  elements.searchPanel.hidden = false;
  elements.searchToggle.hidden = true;
  updateTopbar();
  requestAnimationFrame(() => elements.searchInput.focus());
}

function closeSearch(shouldRender = true) {
  query = "";
  elements.searchInput.value = "";
  elements.clearSearch.hidden = true;
  elements.searchPanel.hidden = true;
  elements.searchToggle.hidden = false;
  if (shouldRender) render();
  else updateTopbar();
}

function openEditor(type, record = null) {
  editing = { type, id: record?.id || null };
  elements.dialogTitle.textContent = editorTitles[type][record ? 1 : 0];
  elements.formFields.innerHTML = editorTemplate(type, record, store.state.clients);
  elements.dialog.showModal();
  telegram.showBack(true);
  telegram.setMain("Сохранить", true);
  telegram.impact("medium");
  requestAnimationFrame(() => elements.form.querySelector("input")?.focus());
}

function closeEditor() {
  if (elements.dialog.open) elements.dialog.close();
  editing = null;
  updateTopbar();
}

function openEditorForCurrentScreen() {
  const type = typeForScreen[screen];
  if (type) openEditor(type);
}

function handleMainAction() {
  if (editing) elements.form.requestSubmit();
  else openEditorForCurrentScreen();
}

function handleBackAction() {
  if (editing) closeEditor();
  else if (!elements.searchPanel.hidden) closeSearch();
  else goHome();
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
  if (go) return openScreen(go.dataset.go);

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
  elements.backButton.addEventListener("click", handleBackAction);
  elements.fallbackMain.addEventListener("click", openEditorForCurrentScreen);
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
      updateTopbar();
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