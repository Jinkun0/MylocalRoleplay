import { Link, useLocation } from 'wouter';
import { 
  BookOpen, Globe, Users, Clock, BrainCircuit, 
  Network, Save, Settings, Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Terminal', icon: BookOpen },
  { href: '/world', label: 'World', icon: Globe },
  { href: '/npcs', label: 'Entities', icon: Users },
  { href: '/events', label: 'Events', icon: Clock },
  { href: '/memory', label: 'Memories', icon: BrainCircuit },
  { href: '/relationships', label: 'Links', icon: Network },
  { href: '/saves', label: 'Saves', icon: Save },
  { href: '/settings', label: 'Config', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden selection:bg-primary/30 font-sans dark">
      {/* Background aesthetic noise/gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-sm flex flex-col hidden md:flex relative z-10">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Activity className="w-5 h-5 text-primary mr-3 animate-pulse" />
          <span className="font-bold tracking-[0.2em] text-primary uppercase text-sm">Engine</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-xs uppercase tracking-widest transition-all duration-300 border-l-2",
                  isActive 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:border-muted-foreground/30"
                )}
              >
                <item.icon className={cn("w-4 h-4 mr-4", isActive ? "opacity-100" : "opacity-50")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border text-[10px] text-muted-foreground uppercase tracking-widest text-center opacity-50">
          NSE v0.1.0-alpha
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden z-10">
        {children}
      </main>
    </div>
  );
}
