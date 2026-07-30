import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from './components/layout/AppLayout';
import Home from './pages/Home';
import World from './pages/World';
import Npcs from './pages/Npcs';
import NpcProfile from './pages/NpcProfile';
import Events from './pages/Events';
import Memory from './pages/Memory';
import Relationships from './pages/Relationships';
import Saves from './pages/Saves';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/world" component={World} />
        <Route path="/npcs" component={Npcs} />
        <Route path="/npcs/:id" component={NpcProfile} />
        <Route path="/events" component={Events} />
        <Route path="/memory" component={Memory} />
        <Route path="/relationships" component={Relationships} />
        <Route path="/saves" component={Saves} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm uppercase tracking-widest">
            404 - Signal Lost
          </div>
        </Route>
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
