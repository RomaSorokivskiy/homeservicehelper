import { readFileSync } from "node:fs";

const file = process.argv[2] || `${process.env.HOME}/.local/state/homeservicehelper/health-history.jsonl`;
const since = Date.now() - 30 * 86400000;
const reports = readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((x) => Date.parse(x.generatedAt) >= since);
if (!reports.length) throw new Error("No health samples in the last 30 days");
const services = [...new Set(reports.flatMap((x) => x.checks.map((c) => c.name)))];
const availability = Object.fromEntries(services.map((name) => { const samples=reports.flatMap((x)=>x.checks.filter((c)=>c.name===name)); return [name, Number((100*samples.filter((x)=>x.ok).length/samples.length).toFixed(3))]; }));
const result = { windowDays: 30, samples: reports.length, target: 99.5, availability, targetMet: Object.values(availability).every((value) => value >= 99.5), generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (!result.targetMet) process.exitCode = 2;
