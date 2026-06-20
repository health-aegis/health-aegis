import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout() {
  return (
    <div className="app-shell animate-fade-in">
      <Sidebar />
      <main className="app-main">
        <TopNav />
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
