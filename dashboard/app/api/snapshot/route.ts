import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
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
    services: ["Mealie", "Vikunja", "Homebox", "Vaultwarden"].map((name) => ({ name, ok: true })),
  });
}
