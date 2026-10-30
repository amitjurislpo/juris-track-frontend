import { useCallback, useEffect, useRef, useState } from "react";
import { Link, matchPath, useLocation } from "react-router";
import { Avatar } from "@/standalone/components/Avatar";
import { BrandLockup } from "@/standalone/components/BrandLockup";
import { LanguageSwitcher } from "@/standalone/components/LanguageSwitcher";
import { TimeZoneSwitcher } from "@/standalone/components/TimeZoneSwitcher";
import { useIsNarrowScreen } from "@/standalone/components/useIsNarrowScreen";
import { useT } from "@/standalone/i18n/client";
import { signOut } from "@/standalone/login/actions";
import { navFor } from "@/standalone/nav";
import { fullNameOf, type CurrentUser } from "@/standalone/session";
import { Icon } from "@/track/components/Icon";
import { ROLE_LABELS, homeFor } from "@/track/roles";
import { trackRoutes } from "@/track/routes";
import { currentTheme, setTheme, type Theme } from "./theme";

const FOLD_KEY = "jt_rail_folded";

/** The frame of every signed-in page: sidebar (per role), top bar (page title, theme, language, account menu) and the page. */
export function Shell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const t = useT();
  const { pathname } = useLocation();
  const [isSideOpen, setIsSideOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isNarrowScreen = useIsNarrowScreen();
  const sideRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  // the wide-screen menu can be folded to icons; the choice is remembered in this browser (the page works without storage)
  const [isFolded, setIsFolded] = useState(() => { try { return window.localStorage.getItem(FOLD_KEY) === "1"; } catch { return false; } });
  const [railTip, setRailTip] = useState<{ text: string; top: number } | null>(null);
  const toggleFold = () => {
    const nextFolded = !isFolded;
    setIsFolded(nextFolded);
    setRailTip(null);
    try { window.localStorage.setItem(FOLD_KEY, nextFolded ? "1" : "0"); } catch { /* storage unavailable: the choice lasts for this visit only */ }
  };
  // a folded item shows its name beside it on pointer hover or keyboard focus
  const showRailTip = (e: React.SyntheticEvent) => {
    if (!isFolded) return;
    const tipTarget = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
    if (!tipTarget) return;
    const bounds = tipTarget.getBoundingClientRect();
    setRailTip({ text: tipTarget.dataset.tip ?? "", top: bounds.top + bounds.height / 2 });
  };
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const fullName = fullNameOf(user);
  const navGroups = navFor(user.role);
  const navItems = navGroups.flatMap((navGroup) => navGroup.items);
  const pageTitle = trackRoutes.find((route) => matchPath({ path: `/${route.path}`, end: true }, pathname))?.title;

  // close transient UI on navigation (state adjusted during render, not in an effect)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsSideOpen(false);
    setIsMenuOpen(false);
  }

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  // the drawer: focus moves into it when it opens and back to the menu button when it closes
  const wasSideOpen = useRef(false);
  useEffect(() => {
    if (isSideOpen) sideRef.current?.querySelector<HTMLElement>("a")?.focus();
    else if (wasSideOpen.current && (document.activeElement === document.body || sideRef.current?.contains(document.activeElement))) burgerRef.current?.focus();
    wasSideOpen.current = isSideOpen;
  }, [isSideOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsSideOpen(false);
      }
    };
    const onClickAway = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(".menu-anchor")) setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickAway);
    };
  }, []);

  // the nav item whose link is the longest prefix of the current path is the highlighted one
  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  return (
      <div className="shell">
        <a className="skip" href="#main">{t("Skip to content")}</a>
        <div className={`scrim${isSideOpen ? " open" : ""}`} onClick={() => setIsSideOpen(false)}></div>
        {/* a closed drawer is inert: its links are out of the tab order and the accessibility tree */}
        <aside id="side" ref={sideRef} className={`side${isSideOpen ? " open" : ""}${isFolded ? " folded" : ""}`} aria-label={t("Main menu")} inert={isNarrowScreen && !isSideOpen} onMouseOver={showRailTip} onFocus={showRailTip} onMouseOut={() => setRailTip(null)} onBlur={() => setRailTip(null)}>
          <Link className="ws" to={homeFor(user.role)} data-tip="JURIS TRACK">
            <BrandLockup product="JURIS TRACK" />
          </Link>
          {navGroups.map((navGroup) => (
            <div key={navGroup.title} style={{ display: "contents" }}>
              <div className="group">{t(navGroup.title)}</div>
              {navGroup.items.map((navItem) => (
                <Link key={navItem.href} to={navItem.href} className={`nav-item${activeHref === navItem.href ? " on" : ""}`} aria-current={activeHref === navItem.href ? "page" : undefined} data-tip={t(navItem.label)}>
                  <span className="ic"><Icon name={navItem.icon} size={17} /></span>
                  <span className="nav-label">{t(navItem.label)}</span>
                </Link>
              ))}
            </div>
          ))}
          <div className="rail-foot">
            <button type="button" className="rail-fold" onClick={toggleFold} aria-expanded={!isFolded} aria-label={isFolded ? t("Open the menu") : t("Fold the menu")} data-tip={isFolded ? t("Open the menu") : t("Fold the menu")}>
              <Icon name="chevL" size={16} /><span className="nav-label">{isFolded ? t("Open the menu") : t("Fold the menu")}</span>
            </button>
          </div>
        </aside>
        {railTip && isFolded && <span role="tooltip" className="rail-tip" style={{ top: railTip.top }}>{railTip.text}</span>}

        <div className="main">
          <header className="top">
            <button ref={burgerRef} className="icon-btn burger" onClick={() => setIsSideOpen(true)} aria-label={t("Open menu")} aria-controls="side" aria-expanded={isSideOpen}><Icon name="menu" /></button>
            <div className="crumbs"><span>Juris</span><Icon name="chevR" size={14} /><b>{t(pageTitle ?? "JurisTrack")}</b></div>
            <div className="grow"></div>
            <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t("Switch to light theme") : t("Switch to dark theme")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
            </button>
            {user.role !== "SUPER_ADMIN" && <TimeZoneSwitcher />}
            <LanguageSwitcher />
            <div className="menu-anchor" style={{ position: "relative" }}>
              <button className="profile" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-haspopup="menu" aria-expanded={isMenuOpen}>
                <Avatar name={fullName} />
                <span className="who"><b>{fullName}</b><small>{t(ROLE_LABELS[user.role])}</small></span>
                <Icon name="chevD" size={14} />
              </button>
              {isMenuOpen && (
                <div className="menu" role="menu">
                  <div className="head">
                    <Avatar name={fullName} isLarge />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b>{fullName}</b><span className="faint" style={{ fontSize: 12.5 }}>{user.email}</span></div>
                  </div>
                  <button role="menuitem" onClick={toggleTheme}><Icon name={theme === "dark" ? "sun" : "moon"} size={16} />{theme === "dark" ? t("Light theme") : t("Dark theme")}</button>
                  <div className="sep"></div>
                  <button role="menuitem" className="danger" onClick={() => { void signOut(); }}><Icon name="logout" size={16} />{t("Sign out")}</button>
                </div>
              )}
            </div>
          </header>
          <main id="main" tabIndex={-1} className="content" key={pathname}>{children}</main>
        </div>
      </div>
  );
}
