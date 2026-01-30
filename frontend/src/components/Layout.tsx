import { Outlet, NavLink } from 'react-router-dom';
import { Home, PlusCircle, Package, BarChart3, Sparkles } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine to-wine-light text-white safe-area-top">
        <div className="px-4 py-4 flex items-center justify-center gap-2">
          <span className="text-2xl">🏺</span>
          <h1 className="text-xl font-display font-semibold tracking-wide">Antique Tracker</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 pb-24 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-cream-dark safe-area-bottom shadow-lg">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <NavItem to="/" icon={<Home size={22} />} label="Home" />
          <NavItem to="/add" icon={<PlusCircle size={22} />} label="Add" />
          <NavItem to="/identify" icon={<Sparkles size={22} />} label="Identify" />
          <NavItem to="/inventory" icon={<Package size={22} />} label="Items" />
          <NavItem to="/analytics" icon={<BarChart3 size={22} />} label="Stats" />
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
        `flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'text-wine bg-wine/10' 
            : 'text-bronze hover:text-wine'
        }`
      }
    >
      {icon}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </NavLink>
  );
}
