import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Generate from "./pages/Generate";
import Vault from "./pages/Vault";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/logs", label: "Logs" },
  { to: "/generate", label: "Generate" },
  { to: "/vault", label: "Vault" }
];

export default function App() {
  return (
    <div className="main-shell">
      <aside className="sidebar">
        <h1>Agent Spark</h1>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/vault" element={<Vault />} />
        </Routes>
      </main>
    </div>
  );
}
