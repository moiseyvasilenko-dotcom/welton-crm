export class TelegramBridge {
  constructor() {
    const sdk = window.Telegram?.WebApp;
    this.webApp = sdk?.initData ? sdk : null;
    this.onMain = null;
    this.onBack = null;
  }

  get active() {
    return Boolean(this.webApp);
  }

  init({ onMain, onBack }) {
    if (!this.webApp) return;
    this.onMain = onMain;
    this.onBack = onBack;
    const tg = this.webApp;
    document.body.classList.add("telegram");
    tg.ready();
    tg.expand();
    try { if (tg.isFullscreen) tg.exitFullscreen?.(); } catch {}
    try { tg.disableVerticalSwipes?.(); } catch {}
    try { tg.setHeaderColor?.("bg_color"); } catch {}
    try { tg.setBackgroundColor?.("bg_color"); } catch {}
    try { tg.setBottomBarColor?.("bottom_bar_bg_color"); } catch {}
    tg.MainButton.onClick(onMain);
    tg.BackButton.onClick(onBack);
    this.syncTheme();
    this.syncInsets();
    tg.onEvent?.("themeChanged", () => this.syncTheme());
    tg.onEvent?.("viewportChanged", () => this.syncInsets());
    tg.onEvent?.("safeAreaChanged", () => this.syncInsets());
    tg.onEvent?.("contentSafeAreaChanged", () => this.syncInsets());
    tg.onEvent?.("fullscreenChanged", () => this.syncInsets());
  }

  syncInsets() {
    const tg = this.webApp;
    if (!tg) return;
    const safe = tg.safeAreaInset || {};
    const content = tg.contentSafeAreaInset || {};
    const root = document.documentElement;
    for (const side of ["top", "right", "bottom", "left"]) {
      const values = [safe[side], content[side]].map(Number).filter(Number.isFinite);
      const property = `--app-inset-${side}`;
      if (values.length) root.style.setProperty(property, `${Math.max(...values)}px`);
      else root.style.removeProperty(property);
    }
  }

  syncTheme() {
    const color = this.webApp?.themeParams?.bg_color;
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }

  setMain(text, visible = true) {
    this.webApp?.MainButton?.setParams({ text, is_active: true, is_visible: visible });
  }

  showBack(show = true) {
    if (!this.webApp) return;
    show ? this.webApp.BackButton.show() : this.webApp.BackButton.hide();
  }

  impact(style = "light") {
    try { this.webApp?.HapticFeedback?.impactOccurred(style); } catch {}
  }

  selection() {
    try { this.webApp?.HapticFeedback?.selectionChanged(); } catch {}
  }

  success() {
    try { this.webApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
  }
}
