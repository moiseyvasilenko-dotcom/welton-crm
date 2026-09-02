import { escapeHtml } from "./utils.js?v=4";

function field(label, name, type = "text", value = "", attributes = "") {
  return `<label class="form-row"><span>${escapeHtml(label)}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${attributes}></label>`;
}

function selectField(label, name, options, selected = "") {
  const choices = options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(text)}</option>`).join("");
  return `<label class="form-row"><span>${escapeHtml(label)}</span><select name="${name}">${choices}</select></label>`;
}

function noteField(label, value = "") {
  return `<label class="form-note"><span>${escapeHtml(label)}</span><textarea name="note" placeholder="Добавить комментарий">${escapeHtml(value)}</textarea></label>`;
}

export function editorTemplate(type, record, clients) {
  if (type === "client") {
    return `<section class="form-group">${field("Имя", "name", "text", record?.name, 'required autocomplete="name" placeholder="Имя клиента"')}${field("Телефон", "phone", "tel", record?.phone, 'autocomplete="tel" placeholder="+7 700 000 00 00"')}${selectField("Статус", "status", [["Новый", "Новый"], ["В работе", "В работе"], ["Постоянный", "Постоянный"]], record?.status || "Новый")}</section>${noteField("Заметка", record?.note)}`;
  }
  if (type === "deal") {
    return `<section class="form-group">${field("Название", "title", "text", record?.title, 'required placeholder="Название сделки"')}${field("Сумма", "amount", "number", record?.amount, 'min="0" inputmode="numeric" placeholder="0"')}${selectField("Клиент", "clientId", [["", "Без клиента"], ...clients.map((client) => [client.id, client.name])], record?.clientId || "")}${selectField("Этап", "status", [["Новая", "Новая"], ["Переговоры", "Переговоры"], ["Успешно", "Успешно"], ["Отказ", "Отказ"]], record?.status || "Новая")}</section>`;
  }
  return `<section class="form-group">${field("Задача", "title", "text", record?.title, 'required placeholder="Что нужно сделать"')}${field("Срок", "date", "date", record?.date)}</section>${noteField("Комментарий", record?.note)}`;
}
