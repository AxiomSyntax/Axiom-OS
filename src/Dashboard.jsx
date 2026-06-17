import React from "react";
import "./index.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h2 className="section-title">Mission Control</h2>
      <div className="cards-grid">
        <div className="card glass">
          <h3>Agents</h3>
          <p>Manage all your agents in one place.</p>
        </div>
        <div className="card glass">
          <h3>Tasks</h3>
          <p>Kanban board to orchestrate workflows.</p>
        </div>
        <div className="card glass">
          <h3>Memory Vault</h3>
          <p>Browse and edit your notes.</p>
        </div>
        <div className="card glass">
          <h3>Terminal</h3>
          <p>Chat with LLMs directly.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
