import { Outlet, NavLink } from 'react-router-dom';
import { Home, PlusCircle, Package, BarChart3, Camera } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-amber-700 text-white p-4 safe-area-top">
        <h1 className="text-xl font-bold text-center">🏺 Antique Tracker</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 pb-20 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          <NavItem to="/" icon={<Home size={24} />} label="Home" />
          <NavItem to="/add" icon={<PlusCircle size={24} />} label="Add" />
          <NavItem to="/identify" icon={<Camera size={24} />} label="ID" />
          <NavItem to="/inventory" icon={<Package size={24} />} label="Items" />
          <NavItem to="/analytics" icon={<BarChart3 size={24} />} label="Stats" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center px-3 py-2 ${
          isActive ? 'text-amber-700' : 'text-gray-500'
        }`
      }
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </NavLink>
  );
}
