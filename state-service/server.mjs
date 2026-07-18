import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const port = Number(process.env.PORT || 8787);
const dataDir = process.env.DATA_DIR || "/data";
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(`${dataDir}/household.db`);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS residents(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS movie_queue(media_id TEXT PRIMARY KEY, title TEXT NOT NULL, image TEXT, overview TEXT, year INTEGER, added_by INTEGER REFERENCES residents(id), added_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS movie_votes(media_id TEXT NOT NULL REFERENCES movie_queue(media_id) ON DELETE CASCADE, resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE, value INTEGER NOT NULL CHECK(value IN(-1,1)), PRIMARY KEY(media_id,resident_id));
CREATE TABLE IF NOT EXISTS task_assignments(task_id INTEGER PRIMARY KEY, resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, action TEXT NOT NULL, ok INTEGER NOT NULL, actor_id INTEGER, duration_ms INTEGER, created_at TEXT NOT NULL);`);
if (!db.prepare("SELECT 1 FROM residents LIMIT 1").get()) db.prepare("INSERT INTO residents(name,color,created_at) VALUES(?,?,?)").run("Рома", "#657453", new Date().toISOString());

const json = (response, status, value) => { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(value)); };
const body = async (request) => { const chunks=[]; for await (const chunk of request) chunks.push(chunk); return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; };
const state = () => ({
  residents: db.prepare("SELECT id,name,color FROM residents ORDER BY id").all(),
  taskAssignments: db.prepare("SELECT task_id AS taskId,resident_id AS residentId FROM task_assignments ORDER BY task_id").all(),
  queue: db.prepare(`SELECT q.media_id AS id,q.title,q.image,q.overview,q.year,q.added_by AS addedBy,q.added_at AS addedAt,COALESCE(SUM(v.value),0) AS score,COUNT(v.resident_id) AS votes FROM movie_queue q LEFT JOIN movie_votes v ON v.media_id=q.media_id GROUP BY q.media_id ORDER BY score DESC,q.added_at`).all().map((item) => ({ ...item, residentVotes: db.prepare("SELECT resident_id AS residentId,value FROM movie_votes WHERE media_id=?").all(item.id) })),
});

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/state") return json(response, 200, state());
    const data = await body(request);
    if (request.method === "POST" && url.pathname === "/residents") {
      const name=String(data.name||"").trim().slice(0,40); if(name.length<2) return json(response,400,{error:"name"});
      const palette=["#657453","#a66d52","#68788a","#8a6a86"]; db.prepare("INSERT INTO residents(name,color,created_at) VALUES(?,?,?)").run(name,palette[db.prepare("SELECT COUNT(*) AS n FROM residents").get().n%palette.length],new Date().toISOString());
    } else if (request.method === "POST" && url.pathname === "/queue") {
      db.prepare("INSERT INTO movie_queue(media_id,title,image,overview,year,added_by,added_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(media_id) DO NOTHING").run(String(data.id),String(data.title).slice(0,200),data.image||null,String(data.overview||"").slice(0,4000),data.year||null,data.residentId||null,new Date().toISOString());
    } else if (request.method === "DELETE" && url.pathname.startsWith("/queue/")) {
      db.prepare("DELETE FROM movie_queue WHERE media_id=?").run(decodeURIComponent(url.pathname.slice(7)));
    } else if (request.method === "POST" && url.pathname === "/votes") {
      const value=Number(data.value); if(![-1,1].includes(value)) return json(response,400,{error:"value"});
      const current=db.prepare("SELECT value FROM movie_votes WHERE media_id=? AND resident_id=?").get(String(data.mediaId),Number(data.residentId));
      if(current?.value===value) db.prepare("DELETE FROM movie_votes WHERE media_id=? AND resident_id=?").run(String(data.mediaId),Number(data.residentId));
      else db.prepare("INSERT INTO movie_votes(media_id,resident_id,value) VALUES(?,?,?) ON CONFLICT(media_id,resident_id) DO UPDATE SET value=excluded.value").run(String(data.mediaId),Number(data.residentId),value);
    } else if (request.method === "POST" && url.pathname === "/task-assignments") {
      const taskId=Number(data.taskId),residentId=Number(data.residentId); if(!Number.isInteger(taskId)||!Number.isInteger(residentId)) return json(response,400,{error:"assignment"});
      db.prepare("INSERT INTO task_assignments(task_id,resident_id,updated_at) VALUES(?,?,?) ON CONFLICT(task_id) DO UPDATE SET resident_id=excluded.resident_id,updated_at=excluded.updated_at").run(taskId,residentId,new Date().toISOString());
    } else if (request.method === "DELETE" && url.pathname.startsWith("/task-assignments/")) {
      db.prepare("DELETE FROM task_assignments WHERE task_id=?").run(Number(url.pathname.slice(18)));
    } else if (request.method === "POST" && url.pathname === "/audit") {
      db.prepare("INSERT INTO audit_log(action,ok,actor_id,duration_ms,created_at) VALUES(?,?,?,?,?)").run(String(data.action).slice(0,80),data.ok?1:0,data.actorId||null,data.durationMs||null,new Date().toISOString());
    } else return json(response, 404, { error: "not found" });
    return json(response, 200, { ok: true, ...state() });
  } catch (error) { console.error(error); return json(response, 500, { error: "state operation failed" }); }
}).listen(port, "0.0.0.0", () => console.log(`household state listening on ${port}`));
