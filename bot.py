#!/usr/bin/env python3
"""Minimal Telegram launcher bot for Welton CRM."""
import json
import os
import time
import urllib.error
import urllib.request

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
APP_URL = os.environ.get("WELTON_CRM_URL", "https://moiseyvasilenko-dotcom.github.io/welton-crm/")
API = f"https://api.telegram.org/bot{TOKEN}/"


def api(method, payload=None, timeout=45):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        API + method,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        result = json.load(response)
    if not result.get("ok"):
        raise RuntimeError(f"Telegram API method failed: {method}")
    return result["result"]


def send_launcher(chat_id):
    api("sendMessage", {
        "chat_id": chat_id,
        "text": "Добро пожаловать. Клиенты, сделки и задачи — в одном месте.",
        "reply_markup": {
            "inline_keyboard": [[{
                "text": "Открыть CRM",
                "web_app": {"url": APP_URL},
            }]],
        },
    })


def main():
    api("deleteWebhook", {"drop_pending_updates": True})
    offset = None
    while True:
        try:
            payload = {"timeout": 35, "allowed_updates": ["message"]}
            if offset is not None:
                payload["offset"] = offset
            for update in api("getUpdates", payload, timeout=45):
                offset = update["update_id"] + 1
                message = update.get("message") or {}
                text = (message.get("text") or "").split("@", 1)[0]
                if text == "/start":
                    send_launcher(message["chat"]["id"])
        except (urllib.error.URLError, TimeoutError, RuntimeError):
            time.sleep(3)


if __name__ == "__main__":
    main()
