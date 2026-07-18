"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Snapshot = {
  greeting: string;
  residents: string;
  weather: { temperature: number; label: string };
  attention: { tone: "ok" | "warning"; title: string; detail: string };
  tasks: { id: number; title: string; done: boolean; owner: string }[];
  meal: { title: string; note: string };
  home: { temperature: number; humidity: number; doors: string; water: string };
  services: { name: string; ok: boolean }[];
};

const fallback: Snapshot = {
  greeting: "Добрий вечір",
  residents: "Ви обоє вдома",
  weather: { temperature: 22, label: "тихо й тепло" },
  attention: { tone: "ok", title: "Усе гаразд", detail: "Квартира не потребує уваги" },
  tasks: [
    { id: 1, title: "Замовити фільтр для води", done: false, owner: "Разом" },
    { id: 2, title: "Забрати посилку", done: true, owner: "Саша" },
    { id: 3, title: "Полити рослини", done: false, owner: "Дім" },
  ],
  meal: { title: "Паста з печеними томатами", note: "Усі продукти є" },
  home: { temperature: 22.4, humidity: 46, doors: "Зачинено", water: "Норма" },
  services: [
    { name: "Mealie", ok: true }, { name: "Vikunja", ok: true },
    { name: "Homebox", ok: true }, { name: "Vaultwarden", ok: true },
  ],
};

export function HomeDashboard() {
  const [snapshot, setSnapshot] = useState(fallback);
  const [scene, setScene] = useState("Звичайний");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/snapshot").then((r) => r.ok ? r.json() : fallback).then(setSnapshot).catch(() => setSnapshot(fallback));
  }, []);

  const pending = useMemo(() => snapshot.tasks.filter((task) => !task.done), [snapshot.tasks]);

  function capture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get("capture") || "").trim();
    if (!value) return;
    setNotice(`Додано: ${value}`);
    setCaptureOpen(false);
    event.currentTarget.reset();
    window.setTimeout(() => setNotice(""), 3000);
  }

  function chooseScene(next: string) {
    setScene(next);
    setNotice(`Сцена «${next}» активована`);
    window.setTimeout(() => setNotice(""), 3000);
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Основна навігація">
        <a className="brand" href="#today" aria-label="Наш дім — головна"><span>Н</span><b>Наш дім</b></a>
        <nav>
          <a className="active" href="#today"><i>⌂</i><span>Сьогодні</span></a>
          <a href="#plan"><i>✓</i><span>План</span></a>
          <a href="#home"><i>◫</i><span>Дім</span></a>
          <a href="https://things.home.arpa"><i>◇</i><span>Речі</span></a>
          <a href="#rest"><i>▷</i><span>Відпочинок</span></a>
        </nav>
        <div className="sidebar-bottom"><span className="presence-dot" />{snapshot.residents}</div>
      </aside>

      <section className="content" id="today">
        <header className="topbar">
          <div><p className="eyebrow">Субота, 18 липня</p><h1>{snapshot.greeting}</h1></div>
          <div className="weather"><strong>{snapshot.weather.temperature}°</strong><span>{snapshot.weather.label}</span></div>
        </header>

        <section className={`attention ${snapshot.attention.tone}`} aria-live="polite">
          <div className="attention-mark">✓</div>
          <div><p>{snapshot.attention.title}</p><span>{snapshot.attention.detail}</span></div>
          <button aria-label="Переглянути стан квартири">Переглянути</button>
        </section>

        <div className="grid">
          <section className="card tasks" id="plan">
            <div className="card-head"><div><p className="kicker">НАШ ДЕНЬ</p><h2>{pending.length} справи залишилось</h2></div><a href="https://tasks.home.arpa">Усі справи</a></div>
            <ul>
              {snapshot.tasks.map((task) => <li key={task.id} className={task.done ? "done" : ""}><button aria-label={`Позначити «${task.title}» виконаним`}>{task.done ? "✓" : ""}</button><span>{task.title}<small>{task.owner}</small></span></li>)}
            </ul>
          </section>

          <section className="card meal">
            <p className="kicker">СЬОГОДНІ НА ВЕЧЕРЮ</p>
            <div className="meal-art" aria-hidden="true"><span>🍅</span><span>🌿</span><span>🍝</span></div>
            <h2>{snapshot.meal.title}</h2><p>{snapshot.meal.note}</p>
            <a className="primary-link" href="https://mealie.home.arpa">Відкрити рецепт <b>→</b></a>
          </section>

          <section className="card home" id="home">
            <div className="card-head"><div><p className="kicker">ДІМ</p><h2>Спокійний стан</h2></div><span className="status-pill">Усе гаразд</span></div>
            <div className="home-stats">
              <div><small>Температура</small><strong>{snapshot.home.temperature}°</strong><span>Комфортно</span></div>
              <div><small>Вологість</small><strong>{snapshot.home.humidity}%</strong><span>У нормі</span></div>
              <div><small>Двері</small><strong>●</strong><span>{snapshot.home.doors}</span></div>
              <div><small>Вода</small><strong>≈</strong><span>{snapshot.home.water}</span></div>
            </div>
          </section>

          <section className="card scenes">
            <p className="kicker">ШВИДКІ СЦЕНИ</p><h2>Який зараз настрій?</h2>
            <div className="scene-list">
              {["Кіно", "Ніч", "Пішли"].map((item) => <button key={item} className={scene === item ? "selected" : ""} onClick={() => chooseScene(item)}><span>{item === "Кіно" ? "◐" : item === "Ніч" ? "☾" : "↗"}</span>{item}</button>)}
            </div>
            <small>Зараз: {scene}</small>
          </section>
        </div>

        <footer id="rest"><p><span className="presence-dot" /> Усі основні сервіси працюють</p><a href="https://status.home.arpa">Стан системи</a></footer>
      </section>

      <button className="capture-button" onClick={() => setCaptureOpen(true)} aria-label="Швидко додати">＋</button>
      {captureOpen && <div className="modal-backdrop" onMouseDown={() => setCaptureOpen(false)}><form className="capture" onSubmit={capture} onMouseDown={(e) => e.stopPropagation()}><div><p className="kicker">ШВИДКЕ ДОДАВАННЯ</p><button type="button" onClick={() => setCaptureOpen(false)} aria-label="Закрити">×</button></div><label htmlFor="capture">Що потрібно запам’ятати?</label><input autoFocus id="capture" name="capture" placeholder="Наприклад, купити молоко" autoComplete="off"/><fieldset><label><input type="radio" name="kind" value="task" defaultChecked/> Справа</label><label><input type="radio" name="kind" value="shopping"/> Покупка</label></fieldset><button className="submit" type="submit">Додати</button></form></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
