"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";

type MediaItem = {
  id: string;
  title: string;
  type: string;
  overview: string;
  year: number | null;
  image: string | null;
  progress: number;
};
type QueueItem = {
  id: string;
  title: string;
  image: string | null;
  overview: string;
  year: number | null;
  addedBy: number | null;
  score: number;
  votes: number;
  residentVotes: { residentId: number; value: number }[];
};
type Snapshot = {
  connected: Record<string, boolean>;
  tasks: {
    id: number;
    title: string;
    done: boolean;
    due?: string;
    repeatAfter?: number;
  }[];
  shopping: {
    id: string;
    title: string;
    checked: boolean;
    shoppingListId: string;
    quantity: number;
  }[];
  meal: {
    title: string;
    note: string;
    slug?: string;
    servings: number;
    recipeId?: string | null;
  } | null;
  things: { id: string; name: string; quantity: number; type: string }[];
  cinema: {
    configured: boolean;
    serverName: string;
    resume: MediaItem[];
    latest: MediaItem[];
    sessions: {
      id: string;
      name: string;
      client: string;
      nowPlaying: string | null;
      paused: boolean;
    }[];
  };
  home: {
    configured: boolean;
    scenes: { id: string; name: string }[];
    alerts: { id: string; name: string }[];
    lightsOn: number;
    entities: number;
    presence: { id: string; name: string; home: boolean }[];
    energy: { id: string; name: string; value: string; unit: string }[];
    rooms: {
      name: string;
      entities: number;
      lightsOn: number;
      temperature: string | null;
    }[];
  };
  household: {
    residents: { id: number; name: string; color: string }[];
    queue: QueueItem[];
    taskAssignments: { taskId: number; residentId: number }[];
  };
  services: { name: string; connected: boolean; ok: boolean }[];
  generatedAt: string;
};
type Space = "today" | "plan" | "home" | "cinema" | "library";
const empty: Snapshot = {
  connected: {},
  tasks: [],
  shopping: [],
  meal: null,
  things: [],
  cinema: {
    configured: false,
    serverName: "Jellyfin",
    resume: [],
    latest: [],
    sessions: [],
  },
  home: {
    configured: false,
    scenes: [],
    alerts: [],
    lightsOn: 0,
    entities: 0,
    presence: [],
    energy: [],
    rooms: [],
  },
  household: { residents: [], queue: [], taskAssignments: [] },
  services: [],
  generatedAt: "",
};
const labels: Record<string, string> = {
  mealie: "Кухня",
  vikunja: "Справи",
  homebox: "Речі",
  jellyfin: "Кінотеатр",
  homeAssistant: "Розумний дім",
};
const spaces: { id: Space; label: string; icon: string }[] = [
  { id: "today", label: "Сьогодні", icon: "⌂" },
  { id: "plan", label: "План", icon: "✓" },
  { id: "home", label: "Дім", icon: "◇" },
  { id: "cinema", label: "Кіно", icon: "▷" },
  { id: "library", label: "Речі", icon: "□" },
];

export function HomeDashboard() {
  const [data, setData] = useState(empty),
    [loading, setLoading] = useState(true),
    [offline, setOffline] = useState(false),
    [composer, setComposer] = useState(false),
    [palette, setPalette] = useState(false),
    [drawer, setDrawer] = useState(false),
    [space, setSpace] = useState<Space>("today"),
    [kind, setKind] = useState("task.create"),
    [notice, setNotice] = useState(""),
    [lite, setLite] = useState(false),
    [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; type: string; title: string; href: string }[]
  >([]);
  const [residentId, setResidentId] = useState(1);
  const main = useRef<HTMLElement>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/snapshot", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const next = await r.json();
      setData(next);
      localStorage.setItem("home-snapshot-v1", JSON.stringify(next));
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const preference = setTimeout(() => {
      const saved = localStorage.getItem("home-motion"),
        cached = localStorage.getItem("home-snapshot-v1");
      setLite(
        saved === "lite" ||
          (saved === null && matchMedia("(pointer: coarse)").matches),
      );
      if (cached)
        try {
          setData(JSON.parse(cached));
          setLoading(false);
        } catch {
          localStorage.removeItem("home-snapshot-v1");
        }
    }, 0);
    const kick = setTimeout(refresh, 0),
      timer = setInterval(refresh, 60000);
    return () => {
      clearTimeout(preference);
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setComposer(false);
        setDrawer(false);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        const urls = [
          location.href,
          ...Array.from(
            document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
              "script[src],link[href]",
            ),
          ).map((node) =>
            node instanceof HTMLScriptElement ? node.src : node.href,
          ),
        ];
        registration.active?.postMessage({ type: "CACHE_URLS", urls });
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (es) =>
        es.forEach(
          (e) => e.isIntersecting && e.target.classList.add("is-visible"),
        ),
      { threshold: 0.08 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [space, loading]);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [space]);
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => {
        if (!palette || query.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then((r) => r.json())
          .then((v) => setSearchResults(v.results || []))
          .catch(() => {});
      }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [palette, query]);
  async function action(payload: Record<string, unknown>) {
    const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      result = await r.json();
    if (!r.ok) throw new Error(result.error || "Не вдалося виконати дію");
    await refresh();
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      title = String(form.get("title") || "").trim();
    if (!title) return;
    try {
      await action({
        action: kind,
        title,
        due: String(form.get("due") || ""),
        repeatDays: Number(form.get("repeatDays")) || 0,
        quantity: Number(form.get("quantity")) || 1,
        description: String(form.get("description") || ""),
        serialNumber: String(form.get("serialNumber") || ""),
        warrantyExpires: String(form.get("warrantyExpires") || ""),
      });
      setNotice("Готово — дім оновлено");
      setComposer(false);
      e.currentTarget.reset();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Сталася помилка");
    }
    setTimeout(() => setNotice(""), 3500);
  }
  async function toggle(id: number, done: boolean) {
    setData((c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === id ? { ...t, done } : t)),
    }));
    try {
      await action({ action: "task.toggle", id, done });
    } catch {
      await refresh();
      setNotice("Не вдалося змінити справу");
    }
  }
  async function postpone(id: number) {
    try {
      await action({ action: "task.postpone", id });
      setNotice("Перенесено на завтра");
    } catch {
      setNotice("Не вдалося перенести справу");
    }
  }
  async function manageTask(
    id: number,
    title: string,
    mode: "rename" | "delete",
  ) {
    const next =
      mode === "rename" ? window.prompt("Нова назва справи", title) : null;
    if (mode === "rename" && !next?.trim()) return;
    if (mode === "delete" && !window.confirm(`Видалити справу «${title}»?`))
      return;
    try {
      await action({ action: `task.${mode}`, id, title: next });
      setNotice(mode === "rename" ? "Справу оновлено" : "Справу видалено");
    } catch {
      setNotice("Не вдалося змінити справу");
    }
  }
  async function assignTask(id: number, current?: number) {
    try {
      await action({
        action: current === residentId ? "task.unassign" : "task.assign",
        id,
        residentId,
      });
      setNotice(
        current === residentId ? "Виконавця прибрано" : "Справу призначено",
      );
    } catch {
      setNotice("Не вдалося призначити справу");
    }
  }
  async function toggleShopping(
    item: Snapshot["shopping"][number],
    checked: boolean,
  ) {
    setData((c) => ({
      ...c,
      shopping: c.shopping.map((x) =>
        x.id === item.id ? { ...x, checked } : x,
      ),
    }));
    try {
      await action({
        action: "shopping.toggle",
        id: item.id,
        checked,
        shoppingListId: item.shoppingListId,
        title: item.title,
      });
    } catch {
      await refresh();
      setNotice("Не вдалося змінити покупку");
    }
  }
  async function manageShopping(
    item: Snapshot["shopping"][number],
    mode: "rename" | "delete",
  ) {
    const next =
      mode === "rename"
        ? window.prompt("Нова назва покупки", item.title)
        : null;
    if (mode === "rename" && !next?.trim()) return;
    if (
      mode === "delete" &&
      !window.confirm(`Видалити «${item.title}» зі списку?`)
    )
      return;
    try {
      await action({
        action: `shopping.${mode}`,
        id: item.id,
        shoppingListId: item.shoppingListId,
        title: next,
        checked: item.checked,
      });
      setNotice(mode === "rename" ? "Покупку оновлено" : "Покупку видалено");
    } catch {
      setNotice("Не вдалося змінити покупку");
    }
  }
  async function manageThing(
    item: Snapshot["things"][number],
    mode: "update" | "delete",
  ) {
    const next =
      mode === "update" ? window.prompt("Нова назва речі", item.name) : null;
    if (mode === "update" && !next?.trim()) return;
    if (
      mode === "delete" &&
      !window.confirm(`Видалити «${item.name}» з каталогу?`)
    )
      return;
    try {
      await action({
        action: `thing.${mode}`,
        id: item.id,
        title: next,
        quantity: item.quantity,
      });
      setNotice(mode === "update" ? "Річ оновлено" : "Річ видалено");
    } catch {
      setNotice("Не вдалося змінити річ");
    }
  }
  async function setServings() {
    const value = Number(
      window.prompt(
        "Скільки порцій приготувати?",
        String(data.meal?.servings || 2),
      ),
    );
    if (!Number.isInteger(value) || value < 1 || value > 20) return;
    try {
      await action({ action: "meal.servings", servings: value });
      setNotice(`Заплановано ${value} порції`);
    } catch {
      setNotice("Не вдалося змінити порції");
    }
  }
  async function addIngredients() {
    if (!data.meal?.recipeId) return;
    try {
      await action({
        action: "meal.ingredients",
        recipeId: data.meal.recipeId,
        servings: data.meal.servings,
      });
      setNotice("Інгредієнти додано до покупок");
    } catch {
      setNotice("Не вдалося додати інгредієнти");
    }
  }
  const openComposer = (next = "task.create") => {
    setKind(next);
    setComposer(true);
  };
  const commands = useMemo(
    () =>
      [
        {
          label: "Додати справу",
          hint: "Vikunja",
          run: () => openComposer("task.create"),
        },
        {
          label: "Запланувати вечерю",
          hint: "Mealie",
          run: () => openComposer("meal.create"),
        },
        {
          label: "Додати покупку",
          hint: "Mealie",
          run: () => openComposer("shopping.create"),
        },
        {
          label: "Додати річ",
          hint: "Homebox",
          run: () => openComposer("thing.create"),
        },
        {
          label: "Додати мешканця",
          hint: "Наш дім",
          run: () => openComposer("resident.create"),
        },
        ...spaces.map((s) => ({
          label: `Відкрити: ${s.label}`,
          hint: "Розділ",
          run: () => setSpace(s.id),
        })),
      ].filter((x) => x.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const commandKey = (e: KeyboardEvent<HTMLButtonElement>, run: () => void) => {
    if (e.key === "Enter") {
      run();
      setPalette(false);
    }
  };
  const ready = data.services.filter((s) => s.ok).length,
    serviceTotal = data.services.length,
    open = data.tasks.filter((t) => !t.done).length;
  const date = new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <div className={lite ? "app lite" : "app"}>
      <a className="skip" href="#content">
        До вмісту
      </a>
      <div className="ambient" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <aside className="rail" aria-label="Головна навігація">
        <a className="brand" href="#content" aria-label="Наш дім">
          <span>Д</span>
          <b>Наш дім</b>
        </a>
        <nav>
          {spaces.map((s) => (
            <button
              key={s.id}
              className={space === s.id ? "active" : ""}
              onClick={() => setSpace(s.id)}
              aria-current={space === s.id ? "page" : undefined}
            >
              <i>{s.icon}</i>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <button className="utility" onClick={() => setDrawer(true)}>
          <span>•••</span>
          <div>
            <b>Системи</b>
            <small>{ready}/{serviceTotal} онлайн</small>
          </div>
        </button>
      </aside>
      <main id="content" className="workspace" ref={main} tabIndex={-1}>
        <header className="topbar">
          <div className="residents" aria-label="Мешканці">
            {data.household.residents.map((r) => (
              <button
                key={r.id}
                style={{ background: r.color }}
                className={residentId === r.id ? "selected" : ""}
                onClick={() => setResidentId(r.id)}
                aria-pressed={residentId === r.id}
                title={r.name}
              >
                {r.name.slice(0, 1).toUpperCase()}
              </button>
            ))}
            {!data.household.residents.length && <span>Р</span>}
            <p>Наш простір</p>
          </div>
          <div className="top-actions">
            <button onClick={() => setPalette(true)} className="search">
              ⌕ <span>Швидка команда</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="motion"
              onClick={() => {
                const next = !lite;
                setLite(next);
                localStorage.setItem("home-motion", next ? "lite" : "full");
              }}
              aria-pressed={lite}
            >
              {lite ? "Рух: мін." : "Рух: повний"}
            </button>
            <button
              className="avatar"
              onClick={() => setDrawer(true)}
              aria-label="Відкрити системну панель"
            >
              РС
            </button>
          </div>
        </header>
        {offline && (
          <div className="offline" role="alert">
            <b>Панель працює офлайн</b>
            <span>Показуємо останні дані. Перевіримо сервер автоматично.</span>
            <button onClick={refresh}>Спробувати зараз</button>
          </div>
        )}
        {space === "today" && (
          <Today
            data={data}
            loading={loading}
            date={date}
            ready={ready}
            open={open}
            toggle={toggle}
            toggleShopping={toggleShopping}
            manageShopping={manageShopping}
            servings={setServings}
            ingredients={addIngredients}
            add={openComposer}
            details={() => setDrawer(true)}
          />
        )}
        {space === "plan" && (
          <Plan
            data={data}
            residentId={residentId}
            loading={loading}
            toggle={toggle}
            postpone={postpone}
            manage={manageTask}
            assign={assignTask}
            add={openComposer}
          />
        )}
        {space === "library" && (
          <Library
            data={data}
            loading={loading}
            manage={manageThing}
            add={openComposer}
          />
        )}
        {space === "home" && (
          <HomeSpace
            data={data}
            activate={async (entityId) => {
              try {
                await action({ action: "scene.activate", entityId });
                setNotice("Сцену активовано");
              } catch {
                setNotice("Не вдалося активувати сцену");
              }
            }}
          />
        )}
        {space === "cinema" && (
          <Cinema data={data} residentId={residentId} perform={action} />
        )}
      </main>
      {palette && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={() => setPalette(false)}
        >
          <section
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Швидкі команди"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <label>
              <span>⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Команда, справа, річ або фільм…"
              />
            </label>
            <div>
              {commands.map((c, i) => (
                <button
                  key={c.label}
                  autoFocus={i === 0 && !query}
                  onClick={() => {
                    c.run();
                    setPalette(false);
                  }}
                  onKeyDown={(e) => commandKey(e, c.run)}
                >
                  <span>
                    {c.label}
                    <small>{c.hint}</small>
                  </span>
                  <kbd>↵</kbd>
                </button>
              ))}
              {searchResults.map((x) => (
                <a className="search-result" key={x.id} href={x.href}>
                  <span>
                    {x.title}
                    <small>{x.type}</small>
                  </span>
                  <b>↗</b>
                </a>
              ))}
              {!commands.length && !searchResults.length && (
                <p className="no-results">Нічого не знайдено</p>
              )}
            </div>
            <footer>
              Пошук одночасно у справах, речах і домашньому кінотеатрі
            </footer>
          </section>
        </div>
      )}
      {composer && (
        <div className="overlay" onMouseDown={() => setComposer(false)}>
          <form
            className="composer"
            onSubmit={submit}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <p>ШВИДКА ДІЯ</p>
                <h2>Що додамо?</h2>
              </div>
              <button
                type="button"
                onClick={() => setComposer(false)}
                aria-label="Закрити"
              >
                ×
              </button>
            </header>
            <div className="kind-tabs">
              {[
                ["task.create", "Справа"],
                ["meal.create", "Вечеря"],
                ["shopping.create", "Покупка"],
                ["thing.create", "Річ"],
                ["resident.create", "Мешканець"],
              ].map(([v, l]) => (
                <button
                  type="button"
                  key={v}
                  className={kind === v ? "selected" : ""}
                  onClick={() => setKind(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              autoFocus
              name="title"
              aria-label="Назва"
              placeholder={
                kind === "task.create"
                  ? "Наприклад, забрати посилку"
                  : kind === "meal.create"
                    ? "Наприклад, паста з томатами"
                    : kind === "shopping.create"
                      ? "Наприклад, молоко"
                      : kind === "resident.create"
                        ? "Ім’я мешканця"
                        : "Наприклад, гарантія на чайник"
              }
            />
            {kind === "task.create" && (
              <div className="thing-fields">
                <label>
                  Зробити до
                  <input name="due" type="date" />
                </label>
                <label>
                  Повторювати кожні, днів
                  <input
                    name="repeatDays"
                    type="number"
                    min="0"
                    max="365"
                    placeholder="0 — не повторювати"
                  />
                </label>
              </div>
            )}
            {kind === "thing.create" && (
              <div className="thing-fields">
                <label>
                  Кількість
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </label>
                <label>
                  Гарантія до
                  <input name="warrantyExpires" type="date" />
                </label>
                <label className="wide">
                  Серійний номер
                  <input name="serialNumber" placeholder="Необов’язково" />
                </label>
                <label className="wide">
                  Опис або місце
                  <textarea
                    name="description"
                    placeholder="Наприклад, шафа у коридорі, верхня полиця"
                  />
                </label>
              </div>
            )}
            <button className="save">Додати до дому</button>
          </form>
        </div>
      )}
      {drawer && (
        <aside className="drawer" aria-label="Системи дому">
          <header>
            <div>
              <p>СИСТЕМА ДОМУ</p>
              <h2>Усе під контролем</h2>
            </div>
            <button onClick={() => setDrawer(false)} aria-label="Закрити">
              ×
            </button>
          </header>
          <div className="health">
            {data.services.map((s) => (
              <div key={s.name}>
                <i className={s.ok ? "on" : "off"} />
                <span>
                  <b>{labels[s.name]}</b>
                  <small>
                    {s.ok
                      ? "Працює"
                      : s.connected
                        ? "Потрібна увага"
                        : "Не підключено"}
                  </small>
                </span>
              </div>
            ))}
          </div>
          <div className="drawer-links">
            <a href="https://vault.home.arpa">
              Vaultwarden <span>↗</span>
            </a>
            <a href="https://mealie.home.arpa">
              Mealie <span>↗</span>
            </a>
            <a href="https://tasks.home.arpa">
              Vikunja <span>↗</span>
            </a>
            <a href="https://things.home.arpa">
              Homebox <span>↗</span>
            </a>
            <a href="https://cinema.home.arpa">
              Jellyfin <span>↗</span>
            </a>
            <a href="https://assistant.home.arpa">
              Home Assistant <span>↗</span>
            </a>
          </div>
          <p className="synced">
            Остання синхронізація
            <br />
            <b>
              {data.generatedAt
                ? new Date(data.generatedAt).toLocaleTimeString("uk-UA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </b>
          </p>
        </aside>
      )}
      {drawer && (
        <button
          className="drawer-shade"
          onClick={() => setDrawer(false)}
          aria-label="Закрити панель"
        />
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}

function Today({
  data,
  loading,
  date,
  ready,
  open,
  toggle,
  toggleShopping,
  manageShopping,
  servings,
  ingredients,
  add,
  details,
}: {
  data: Snapshot;
  loading: boolean;
  date: string;
  ready: number;
  open: number;
  toggle: (id: number, d: boolean) => void;
  toggleShopping: (item: Snapshot["shopping"][number], c: boolean) => void;
  manageShopping: (
    item: Snapshot["shopping"][number],
    m: "rename" | "delete",
  ) => void;
  servings: () => void;
  ingredients: () => void;
  add: (k?: string) => void;
  details: () => void;
}) {
  return (
    <>
      <section className="today-scene" aria-label="Огляд дому">
        <div className="home-hero" data-reveal data-depth="0">
          <div className="hero-light" aria-hidden="true" />
          <div className="hero-copy" data-depth="4">
            <p>{date}</p>
            <h1>
              Спокійний ритм
              <br />
              <em>вашого дому.</em>
            </h1>
            <span>Усе важливе — поруч.</span>
            <button className="add-main" onClick={() => add()}>
              <i>＋</i>
              <span>Додати</span>
            </button>
          </div>
        </div>
        <div className="dinner-feature" data-reveal data-depth="3">
          <Image
            src="/home-evening.jpg"
            alt="Паста з томатами на теплому вечірньому столі"
            fill
            sizes="(max-width: 900px) 100vw, 40vw"
            priority
          />
          <div>
            <small>СЬОГОДНІ НА ВЕЧІР</small>
            <h2>
              {data.meal
                ? `${data.meal.servings} порції затишку`
                : "Вечеря удвох"}
            </h2>
            <i />
            <p>{data.meal?.title || "Вечерю ще не обрано"}</p>
            <aside>
              <button onClick={servings}>Порції</button>
              <button onClick={() => add("meal.create")}>
                Замінити вечерю
              </button>
              {data.meal?.recipeId && (
                <button onClick={ingredients}>Інгредієнти → покупки</button>
              )}
            </aside>
          </div>
        </div>
        <button className="pulse" onClick={details} data-reveal data-depth="4">
          <i>⌂</i>
          <span>
            <b>
              {ready === data.services.length
                ? "Дім у порядку"
                : "Потрібне підключення"}
            </b>
            <small>{ready}/{data.services.length} системи відповідають</small>
          </span>
          <div className="home-signals" aria-hidden="true">
            <i>◉</i>
            <i>ϟ</i>
            <i>⌁</i>
          </div>
          <strong>{open} відкритих справ　→</strong>
        </button>
      </section>
      <div className="grid lower-grid">
        <Panel
          title="Справи на сьогодні"
          eyebrow="СПІЛЬНИЙ ПЛАН"
          badge={`${open}`}
          className="tasks"
          loading={loading}
        >
          <TaskList data={data} toggle={toggle} />
        </Panel>
        <Panel
          title="Список покупок"
          eyebrow="MEALIE"
          action={() => add("shopping.create")}
          loading={loading}
        >
          <ShoppingBoard
            data={data}
            toggle={toggleShopping}
            manage={manageShopping}
          />
        </Panel>
        <Panel
          title="Нові речі"
          eyebrow="HOMEBOX"
          action={() => add("thing.create")}
          loading={loading}
        >
          {data.things.length ? (
            <Things data={data} />
          ) : (
            <Empty
              text={
                data.connected.homebox
                  ? "Тут з’являться ваші речі"
                  : "Підключіть Homebox"
              }
            />
          )}
        </Panel>
      </div>
    </>
  );
}
function ShoppingBoard({
  data,
  toggle,
  manage,
}: {
  data: Snapshot;
  toggle: (item: Snapshot["shopping"][number], c: boolean) => void;
  manage: (item: Snapshot["shopping"][number], m: "rename" | "delete") => void;
}) {
  const [mode, setMode] = useState(false),
    items = data.shopping.filter((x) => !x.checked);
  const category = (title: string) =>
    /молок|сир|йогурт|масл/i.test(title)
      ? "Молочне"
      : /томат|овоч|фрукт|яблук|банан/i.test(title)
        ? "Овочі та фрукти"
        : /хліб|булк|лаваш/i.test(title)
          ? "Хліб"
          : /м’яс|курк|риба/i.test(title)
            ? "М’ясо та риба"
            : "Інше";
  const groups = Object.entries(
    Object.groupBy(items, (x) => category(x.title)),
  );
  if (!items.length)
    return (
      <Empty
        text={
          data.connected.mealie
            ? "Список порожній — чудовий знак"
            : "Підключіть Mealie"
        }
      />
    );
  return (
    <>
      <button className="shopping-mode-toggle" onClick={() => setMode(true)}>
        Режим магазину ↗
      </button>
      <div className="chips shopping-groups">
        {groups.map(([name, group]) => (
          <section key={name}>
            <h3>{name}</h3>
            <div className="shopping-tiles">
              {group?.slice(0, 8).map((x) => (
                <div key={x.id}>
                  <button onClick={() => toggle(x, true)}>
                    ◌　{x.title}
                    {x.quantity > 1 ? ` · ${x.quantity}` : ""}
                  </button>
                  <button
                    onClick={() => manage(x, "rename")}
                    aria-label={`Редагувати ${x.title}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => manage(x, "delete")}
                    aria-label={`Видалити ${x.title}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {mode && (
        <div className="shopping-mode" role="dialog" aria-modal="true">
          <header>
            <div>
              <p>ОДНІЄЮ РУКОЮ</p>
              <h2>У магазині</h2>
            </div>
            <button onClick={() => setMode(false)}>×</button>
          </header>
          {groups.map(([name, group]) => (
            <section key={name}>
              <h3>{name}</h3>
              {group?.map((x) => (
                <button key={x.id} onClick={() => toggle(x, true)}>
                  <i>○</i>
                  <span>
                    {x.title}
                    <small>
                      {x.quantity > 1
                        ? `${x.quantity} шт.`
                        : "Торкніться, коли взяли"}
                    </small>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
function Plan({
  data,
  residentId,
  loading,
  toggle,
  postpone,
  manage,
  assign,
  add,
}: {
  data: Snapshot;
  residentId: number;
  loading: boolean;
  toggle: (id: number, d: boolean) => void;
  postpone: (id: number) => void;
  manage: (id: number, title: string, m: "rename" | "delete") => void;
  assign: (id: number, current?: number) => void;
  add: (k?: string) => void;
}) {
  return (
    <section className="space-page">
      <header data-reveal>
        <p>СПІЛЬНИЙ РИТМ</p>
        <h1>План</h1>
        <span>Усе, що варто пам’ятати сьогодні та пізніше.</span>
        <button onClick={() => add("task.create")}>＋ Нова справа</button>
      </header>
      <Panel
        title="Усі справи"
        eyebrow="VIKUNJA"
        badge={`${data.tasks.length} загалом`}
        loading={loading}
      >
        <TaskList
          data={data}
          residentId={residentId}
          toggle={toggle}
          postpone={postpone}
          manage={manage}
          assign={assign}
          all
        />
      </Panel>
    </section>
  );
}
function Library({
  data,
  loading,
  manage,
  add,
}: {
  data: Snapshot;
  loading: boolean;
  manage: (item: Snapshot["things"][number], m: "update" | "delete") => void;
  add: (k?: string) => void;
}) {
  return (
    <section className="space-page">
      <header data-reveal>
        <p>ДЕ ЩО ЛЕЖИТЬ</p>
        <h1>Речі</h1>
        <span>Домашній каталог без пошуків по коробках.</span>
        <button onClick={() => add("thing.create")}>＋ Додати річ</button>
      </header>
      <Panel
        title="Домашня бібліотека"
        eyebrow="HOMEBOX"
        badge={`${data.things.length} записів`}
        loading={loading}
      >
        {data.things.length ? (
          <Things data={data} manage={manage} all />
        ) : (
          <Empty text="Каталог готовий до першого запису" />
        )}
      </Panel>
    </section>
  );
}
function Cinema({
  data,
  residentId,
  perform,
}: {
  data: Snapshot;
  residentId: number;
  perform: (p: Record<string, unknown>) => Promise<void>;
}) {
  const items = data.cinema.resume.length
    ? data.cinema.resume
    : data.cinema.latest;
  const target = data.cinema.sessions[0];
  const winner = data.household.queue[0];
  const startMovieNight = (itemId: string) =>
    target &&
    perform({ action: "movie-night.start", sessionId: target.id, itemId });
  const pickForUs = () => {
    const bestScore = Math.max(
      ...data.household.queue.map((item) => item.score),
    );
    const tied = data.household.queue.filter(
      (item) => item.score === bestScore,
    );
    const picked = tied[Math.floor(Math.random() * tied.length)];
    if (picked) startMovieNight(picked.id);
  };
  return (
    <section className="cinema-page">
      <header data-reveal>
        <p>ДОМАШНІЙ КІНОТЕАТР</p>
        <h1>
          {data.cinema.configured
            ? "Що дивимось увечері?"
            : "Кінотеатр уже на сервері."}
        </h1>
        <span>
          {data.cinema.configured
            ? "Складіть спільну добірку, проголосуйте й запустіть переможця на телевізорі."
            : "Завершіть перший запуск Jellyfin — медіатека одразу з’явиться тут."}
        </span>
        <a href="https://cinema.home.arpa">Відкрити Jellyfin ↗</a>
      </header>
      {target && (
        <div className="player-strip">
          <span>
            <b>{target.name}</b>
            <small>{target.nowPlaying || "Готовий до відтворення"}</small>
          </span>
          <button
            aria-label="Попередній фільм"
            onClick={() =>
              perform({
                action: "cinema.control",
                sessionId: target.id,
                command: "PreviousTrack",
              })
            }
          >
            ‹
          </button>
          <button
            aria-label={target.paused ? "Продовжити відтворення" : "Пауза"}
            onClick={() =>
              perform({
                action: "cinema.control",
                sessionId: target.id,
                command: "PlayPause",
              })
            }
          >
            {target.paused ? "▶" : "Ⅱ"}
          </button>
          <button
            aria-label="Наступний фільм"
            onClick={() =>
              perform({
                action: "cinema.control",
                sessionId: target.id,
                command: "NextTrack",
              })
            }
          >
            ›
          </button>
        </div>
      )}
      {data.household.queue.length > 0 && (
        <section className="watch-queue">
          <header>
            <div>
              <p>НАШ ВЕЧІР</p>
              <h2>Спільний вибір</h2>
            </div>
            {winner && target && (
              <div className="queue-actions">
                <button onClick={() => startMovieNight(winner.id)}>
                  Запустити переможця ▶
                </button>
                <button onClick={pickForUs}>Обрати за нас ✦</button>
              </div>
            )}
          </header>
          <div>
            {data.household.queue.map((item) => {
              const vote =
                item.residentVotes.find((v) => v.residentId === residentId)
                  ?.value || 0;
              return (
                <article key={item.id}>
                  <span>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={`Постер: ${item.title}`}
                        fill
                        sizes="72px"
                      />
                    ) : (
                      "▷"
                    )}
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.year || "Домашня медіатека"}</small>
                  </div>
                  <strong>
                    {item.score > 0 ? "+" : ""}
                    {item.score}
                  </strong>
                  <button
                    aria-label={`Підняти ${item.title} у рейтингу`}
                    className={vote === 1 ? "active" : ""}
                    onClick={() =>
                      perform({
                        action: "queue.vote",
                        itemId: item.id,
                        residentId,
                        value: 1,
                      })
                    }
                  >
                    ＋
                  </button>
                  <button
                    aria-label={`Знизити ${item.title} у рейтингу`}
                    className={vote === -1 ? "active" : ""}
                    onClick={() =>
                      perform({
                        action: "queue.vote",
                        itemId: item.id,
                        residentId,
                        value: -1,
                      })
                    }
                  >
                    −
                  </button>
                  <button
                    aria-label={`Прибрати ${item.title} зі спільного вибору`}
                    onClick={() =>
                      perform({ action: "queue.remove", itemId: item.id })
                    }
                  >
                    ×
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {items.length ? (
        <>
          <h2>Медіатека</h2>
          <div className="poster-grid">
            {items.map((item) => (
              <article key={item.id}>
                <a
                  href={`https://cinema.home.arpa/web/#/details?id=${item.id}`}
                >
                  <div>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 45vw, 220px"
                      />
                    ) : (
                      <span>▷</span>
                    )}
                    <i
                      style={{
                        transform: `scaleX(${Math.max(0, Math.min(100, item.progress)) / 100})`,
                      }}
                    />
                  </div>
                  <b>{item.title}</b>
                  <small>{item.year || item.type}</small>
                </a>
                <button
                  onClick={() =>
                    perform({
                      action: "queue.add",
                      residentId,
                      item: {
                        id: item.id,
                        title: item.title,
                        image: item.image,
                        overview: item.overview,
                        year: item.year,
                      },
                    })
                  }
                >
                  ＋ До спільного вибору
                </button>
                {target && (
                  <button
                    onClick={() =>
                      perform({
                        action: "cinema.play",
                        sessionId: target.id,
                        itemId: item.id,
                      })
                    }
                  >
                    Дивитися на {target.name}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="cinema-empty">
          <i aria-hidden="true">▷</i>
          <h2>
            {data.cinema.configured
              ? "Медіатека поки порожня"
              : "Потрібне одноразове налаштування"}
          </h2>
          <p>
            {data.cinema.configured
              ? "Додайте фільми до /srv/media/movies — Jellyfin просканує їх автоматично."
              : "У Jellyfin створіть домашнього користувача, бібліотеки Movies і Shows та API-ключ для панелі."}
          </p>
        </div>
      )}
    </section>
  );
}
function HomeSpace({
  data,
  activate,
}: {
  data: Snapshot;
  activate: (id: string) => void;
}) {
  return (
    <section className="home-page">
      <header data-reveal>
        <p>РОЗУМНА КВАРТИРА</p>
        <h1>
          Менше кнопок.
          <br />
          Більше затишку.
        </h1>
        <span>
          {data.home.configured
            ? `${data.home.entities} сутностей · ${data.home.lightsOn} світильників увімкнено`
            : "Home Assistant очікує підключення."}
        </span>
        <a href="https://assistant.home.arpa">Відкрити Home Assistant ↗</a>
      </header>
      {data.home.alerts.length > 0 && (
        <div className="safety-alert" role="alert">
          <b>Потрібна увага</b>
          {data.home.alerts.map((a) => (
            <span key={a.id}>{a.name}</span>
          ))}
        </div>
      )}
      <section className="home-summary">
        <div>
          <small>ВДОМА</small>
          <b>
            {data.home.presence
              .filter((x) => x.home)
              .map((x) => x.name)
              .join(", ") || "Нікого не визначено"}
          </b>
        </div>
        <div>
          <small>ЕНЕРГІЯ</small>
          <b>
            {data.home.energy[0]
              ? `${data.home.energy[0].value} ${data.home.energy[0].unit}`
              : "Лічильник не підключено"}
          </b>
        </div>
        <div>
          <small>СВІТЛО</small>
          <b>
            {data.home.lightsOn
              ? `${data.home.lightsOn} увімкнено`
              : "Усе вимкнено"}
          </b>
        </div>
      </section>
      {data.home.rooms.length > 0 && (
        <>
          <h2 className="section-title">Кімнати</h2>
          <div className="room-grid">
            {data.home.rooms.map((room) => (
              <article key={room.name}>
                <i>⌂</i>
                <b>{room.name}</b>
                <small>
                  {room.temperature ? `${room.temperature}° · ` : ""}
                  {room.entities} пристроїв · {room.lightsOn} світла
                </small>
              </article>
            ))}
          </div>
        </>
      )}
      <h2 className="section-title">Сценарії</h2>
      <div className="scene-grid">
        {data.home.scenes.length
          ? data.home.scenes.map((scene) => (
              <button key={scene.id} onClick={() => activate(scene.id)}>
                <i>◇</i>
                <b>{scene.name}</b>
                <small>Активувати сцену</small>
              </button>
            ))
          : ["Вечір", "Ми пішли", "Час спати", "Кіно"].map((name) => (
              <div key={name} aria-disabled="true">
                <i>◇</i>
                <b>{name}</b>
                <small>З’явиться після створення сцени</small>
              </div>
            ))}
      </div>
      <p className="home-note">
        Без сотень перемикачів: безпека, кімнати, присутність, енергія та лише
        корисні сценарії.
      </p>
    </section>
  );
}
function Panel({
  title,
  eyebrow,
  badge,
  action,
  loading,
  className = "",
  children,
}: {
  title: string;
  eyebrow: string;
  badge?: string;
  action?: () => void;
  loading: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`} data-reveal>
      <div className="panel-head">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action ? (
          <button onClick={action} aria-label={`Додати: ${title}`}>
            ＋
          </button>
        ) : badge ? (
          <span>{badge}</span>
        ) : null}
      </div>
      {loading ? <Skeleton /> : children}
    </section>
  );
}
function TaskList({
  data,
  residentId,
  toggle,
  postpone,
  manage,
  assign,
  all = false,
}: {
  data: Snapshot;
  residentId?: number;
  toggle: (id: number, d: boolean) => void;
  postpone?: (id: number) => void;
  manage?: (id: number, title: string, m: "rename" | "delete") => void;
  assign?: (id: number, current?: number) => void;
  all?: boolean;
}) {
  return data.tasks.length ? (
    <ul className="task-list">
      {data.tasks.slice(0, all ? 20 : 6).map((t) => {
        const assigned = data.household.taskAssignments.find(
            (x) => x.taskId === t.id,
          )?.residentId,
          resident = data.household.residents.find((x) => x.id === assigned);
        return (
          <li key={t.id} className={t.done ? "done" : ""}>
            <button
              onClick={() => toggle(t.id, !t.done)}
              aria-label={`${t.done ? "Відкрити" : "Завершити"}: ${t.title}`}
            >
              {t.done ? "✓" : ""}
            </button>
            <div>
              <b>{t.title}</b>
              <small>
                {resident ? `${resident.name} · ` : ""}
                {t.due && new Date(t.due).getFullYear() > 1
                  ? new Date(t.due).toLocaleDateString("uk-UA")
                  : "Без терміну"}
                {t.repeatAfter
                  ? ` · ↻ кожні ${Math.round(t.repeatAfter / 86400)} дн.`
                  : ""}
              </small>
            </div>
            {all && assign && (
              <button
                className={`row-action ${assigned === residentId ? "assigned" : ""}`}
                onClick={() => assign(t.id, assigned)}
              >
                {assigned === residentId ? "Зняти з мене" : "Взяти"}
              </button>
            )}
            {all && !t.done && postpone && (
              <button className="postpone" onClick={() => postpone(t.id)}>
                На завтра
              </button>
            )}
            {all && manage && (
              <>
                <button
                  className="row-action"
                  onClick={() => manage(t.id, t.title, "rename")}
                >
                  Редагувати
                </button>
                <button
                  className="row-action danger"
                  onClick={() => manage(t.id, t.title, "delete")}
                >
                  Видалити
                </button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  ) : (
    <Empty
      text={
        data.connected.vikunja
          ? "На сьогодні все зроблено"
          : "Підключіть Vikunja"
      }
    />
  );
}
function Things({
  data,
  manage,
  all = false,
}: {
  data: Snapshot;
  manage?: (item: Snapshot["things"][number], m: "update" | "delete") => void;
  all?: boolean;
}) {
  return (
    <div className={`things-list ${all ? "all" : ""}`}>
      {data.things.slice(0, all ? 30 : 5).map((x) => (
        <div key={x.id}>
          <span>{x.name.slice(0, 1).toUpperCase()}</span>
          <p>
            <b>{x.name}</b>
            <small>
              {x.type} · {x.quantity} шт.
            </small>
          </p>
          {all && manage && (
            <aside>
              <button onClick={() => manage(x, "update")}>Редагувати</button>
              <button onClick={() => manage(x, "delete")}>Видалити</button>
            </aside>
          )}
        </div>
      ))}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>○</span>
      <p>{text}</p>
      <small>Дані з’являться тут автоматично</small>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Завантаження">
      <i />
      <i />
      <i />
    </div>
  );
}
