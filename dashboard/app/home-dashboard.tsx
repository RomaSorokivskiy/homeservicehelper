"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Snapshot = {
  connected: Record<string, boolean>;
  tasks: { id: number; title: string; done: boolean; due?: string }[];
  shopping: { id: string; title: string; checked: boolean }[];
  meal: { title: string; note: string; slug?: string } | null;
  things: { id: string; name: string; quantity: number; type: string }[];
  services: { name: string; connected: boolean; ok: boolean }[];
  generatedAt: string;
};

const empty: Snapshot = { connected: {}, tasks: [], shopping: [], meal: null, things: [], services: [], generatedAt: "" };
const labels: Record<string, string> = { mealie: "Кухня", vikunja: "Справи", homebox: "Речі" };

export function HomeDashboard() {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(false);
  const [kind, setKind] = useState("task.create");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/snapshot", { cache: "no-store" });
    setData(await response.json()); setLoading(false);
  }, []);
  useEffect(() => { const kickoff = window.setTimeout(refresh, 0); const timer = window.setInterval(refresh, 60000); return () => { clearTimeout(kickoff); clearInterval(timer); }; }, [refresh]);

  async function action(payload: Record<string, unknown>) {
    const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не вдалося виконати дію");
    await refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get("title") || "").trim(); if (!title) return;
    try { await action({ action: kind, title }); setNotice("Готово — додано"); setComposer(false); event.currentTarget.reset(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Сталася помилка"); }
    setTimeout(() => setNotice(""), 3500);
  }

  async function toggle(id: number, done: boolean) {
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done } : task) }));
    try { await action({ action: "task.toggle", id, done }); } catch { await refresh(); setNotice("Не вдалося змінити справу"); }
  }

  const ready = data.services.filter((service) => service.ok).length;
  const date = new Intl.DateTimeFormat("uk-UA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return <main className="app-shell">
    <aside className="rail">
      <a className="logo" href="#top"><span>Д</span><b>Дім</b></a>
      <nav aria-label="Розділи"><a className="active" href="#today">Огляд</a><a href="#tasks">Справи</a><a href="#kitchen">Кухня</a><a href="#things">Речі</a></nav>
      <a className="vault-link" href="https://vault.home.arpa"><span>◇</span><div><b>Сховище</b><small>Vaultwarden</small></div></a>
    </aside>

    <section className="workspace" id="top">
      <header className="hero"><div><p className="date">{date}</p><h1>Усе домашнє<br/><em>в одному місці.</em></h1></div><button className="add-main" onClick={() => setComposer(true)}><span>＋</span> Додати</button></header>

      <section className="pulse" aria-live="polite"><div className="pulse-icon">{ready === 3 ? "✓" : "!"}</div><div><b>{ready === 3 ? "Дім у порядку" : "Потрібне підключення"}</b><span>{ready}/3 інтеграції відповідають · оновлення щохвилини</span></div><div className="service-dots">{data.services.map((s) => <i key={s.name} className={s.ok ? "online" : "offline"} title={`${labels[s.name]}: ${s.ok ? "працює" : s.connected ? "помилка" : "не підключено"}`}/>)}</div></section>

      <div className="dashboard-grid" id="today">
        <section className="panel task-panel" id="tasks"><div className="panel-title"><div><p>НА СЬОГОДНІ</p><h2>Спільні справи</h2></div><span>{data.tasks.filter(t => !t.done).length} відкритих</span></div>
          {loading ? <div className="skeleton"/> : data.tasks.length ? <ul className="task-list">{data.tasks.slice(0,6).map(task => <li key={task.id} className={task.done ? "done" : ""}><button onClick={() => toggle(task.id, !task.done)} aria-label={`Змінити стан: ${task.title}`}>{task.done ? "✓" : ""}</button><div><b>{task.title}</b><small>{task.due ? new Date(task.due).toLocaleDateString("uk-UA") : "Без терміну"}</small></div></li>)}</ul> : <Empty text={data.connected.vikunja ? "Справ поки немає" : "Підключіть Vikunja"}/>} </section>

        <section className="panel meal-panel" id="kitchen"><div className="panel-title"><div><p>ВЕЧЕРЯ</p><h2>{data.meal?.title || "Ще не заплановано"}</h2></div><span className="round-icon">⌁</span></div><div className="meal-visual"><span>сьогодні</span><strong>Смак вечора</strong></div><p>{data.meal?.note || "Оберіть страву в Mealie — вона з’явиться тут автоматично."}</p><a href={data.meal?.slug ? `https://mealie.home.arpa/g/home/r/${data.meal.slug}` : "https://mealie.home.arpa"}>Відкрити кухню →</a></section>

        <section className="panel shopping-panel"><div className="panel-title"><div><p>ПОКУПКИ</p><h2>Список продуктів</h2></div><button onClick={() => {setKind("shopping.create");setComposer(true)}}>＋</button></div>{data.shopping.length ? <div className="chips">{data.shopping.filter(x=>!x.checked).slice(0,8).map(item=><span key={item.id}>{item.title}</span>)}</div> : <Empty text={data.connected.mealie ? "Список порожній" : "Підключіть Mealie"}/>}</section>

        <section className="panel things-panel" id="things"><div className="panel-title"><div><p>КВАРТИРА</p><h2>Останні речі</h2></div><button onClick={() => {setKind("thing.create");setComposer(true)}}>＋</button></div>{data.things.length ? <div className="things-list">{data.things.slice(0,5).map(item=><div key={item.id}><span>{item.name.slice(0,1).toUpperCase()}</span><p><b>{item.name}</b><small>{item.type} · {item.quantity} шт.</small></p></div>)}</div> : <Empty text={data.connected.homebox ? "Речей поки немає" : "Підключіть Homebox"}/>}</section>
      </div>
    </section>

    {composer && <div className="overlay" onMouseDown={() => setComposer(false)}><form className="composer" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><header><div><p>ШВИДКА ДІЯ</p><h2>Що додамо?</h2></div><button type="button" onClick={()=>setComposer(false)}>×</button></header><div className="kind-tabs">{[["task.create","Справа"],["shopping.create","Покупка"],["thing.create","Річ"]].map(([value,label])=><button type="button" key={value} className={kind===value?"selected":""} onClick={()=>setKind(value)}>{label}</button>)}</div><input autoFocus name="title" placeholder={kind==="task.create"?"Наприклад, забрати посилку":kind==="shopping.create"?"Наприклад, молоко":"Наприклад, гарантія на чайник"}/><button className="save" type="submit">Додати до дому</button></form></div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </main>;
}

function Empty({text}:{text:string}) { return <div className="empty"><span>○</span><p>{text}</p></div>; }
