import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
