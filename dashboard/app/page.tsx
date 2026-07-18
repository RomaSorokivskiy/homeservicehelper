import type { Metadata } from "next";
import { HomeDashboard } from "./home-dashboard";

export const metadata: Metadata = {
  title: "Наш дім",
  description: "Спокійна домашня панель для щоденних справ і стану квартири.",
};

export default function Home() {
  return <HomeDashboard />;
}
