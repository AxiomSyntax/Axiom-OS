// src/App.jsx
import React from "react";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🛸 Custom Agent OS</h1>
      </header>
      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  );
}
