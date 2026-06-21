import React, { useState } from 'react';
import Sidebar, { TabId } from './Sidebar';
import Header from './Header';
import { Student, Class, Transaction, AppSettings } from '../../shared/types';

interface MainLayoutProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  settings: AppSettings | null;
  currentUser: { username: string; name: string; role: string };
  students: Student[];
  classes: Class[];
  transactions: Transaction[];
  activeIcon: React.ReactNode;
  activeColor: string;
  activeTitle: string;
  activeSubtitle: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function MainLayout({
  activeTab,
  onTabChange,
  settings,
  currentUser,
  students,
  classes,
  transactions,
  activeIcon,
  activeColor,
  activeTitle,
  activeSubtitle,
  onLogout,
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex overflow-hidden" style={{ height: '100dvh' }}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative z-50 md:z-auto h-full
        transition-transform duration-300 ease-in-out
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            onTabChange(tab);
            setMobileSidebarOpen(false);
          }}
          settings={settings}
          currentUser={currentUser}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          onLogout={onLogout}
        />
      </div>

      {/* MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <Header
          title={activeTitle}
          subtitle={activeSubtitle}
          activeIcon={activeIcon}
          activeColor={activeColor}
          students={students}
          classes={classes}
          transactions={transactions}
          settings={settings}
          currentUser={currentUser}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onTabChange={onTabChange}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
