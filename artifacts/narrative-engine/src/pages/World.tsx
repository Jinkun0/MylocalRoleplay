import { useGetWorldSummary } from '@workspace/api-client-react';
import { Clock, Map, Cloud, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';

export default function World() {
  const { data: summary, isLoading } = useGetWorldSummary();

  if (isLoading) return <div className="p-12 font-mono text-sm uppercase tracking-widest text-muted-foreground animate-pulse">Scanning environment...</div>;
  if (!summary) return <div className="p-12 text-destructive font-mono uppercase tracking-widest">Signal lost.</div>;

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-6xl mx-auto space-y-16">
      <header className="space-y-3 border-b border-border pb-8">
        <h1 className="text-4xl font-serif text-primary">Global State Overview</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
          Telemetry & Synthesis
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-border bg-card/30 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center text-primary mb-6">
            <Clock className="w-4 h-4 mr-3 opacity-70" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Chronology</h2>
          </div>
          <div className="text-3xl font-serif">Day {summary.worldState.worldDay}</div>
          <div className="text-primary/70 font-mono mt-2 tracking-widest text-sm">{summary.worldState.worldTime}</div>
        </div>

        <div className="p-6 border border-border bg-card/30 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center text-primary mb-6">
            <Cloud className="w-4 h-4 mr-3 opacity-70" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Atmosphere</h2>
          </div>
          <div className="text-3xl font-serif capitalize">{summary.worldState.weather}</div>
          <div className="text-primary/70 font-mono mt-2 tracking-widest text-sm uppercase">Status: Nominal</div>
        </div>

        <div className="p-6 border border-border bg-card/30 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center text-primary mb-6">
            <Map className="w-4 h-4 mr-3 opacity-70" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Location</h2>
          </div>
          <div className="text-3xl font-serif truncate" title={summary.worldState.currentLocationName}>
            {summary.worldState.currentLocationName}
          </div>
          <div className="text-primary/70 font-mono mt-2 tracking-widest text-sm uppercase">Mode: {summary.worldState.activeMode}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-6">
          <div className="flex items-center text-primary border-b border-border/50 pb-3">
            <AlertTriangle className="w-4 h-4 mr-3 opacity-70" />
            <h3 className="font-mono uppercase tracking-[0.2em] text-xs">Active Events</h3>
          </div>
          {summary.activeEvents.length === 0 ? (
            <div className="p-6 border border-border border-dashed text-muted-foreground font-mono text-xs uppercase tracking-widest text-center">
              No ongoing anomalies.
            </div>
          ) : (
            <div className="space-y-4">
              {summary.activeEvents.map(event => (
                <div key={event.id} className="p-5 border border-primary/20 bg-primary/5 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
                  <div className="font-serif text-xl text-primary mb-2">{event.title}</div>
                  <div className="text-muted-foreground font-serif text-sm leading-relaxed">{event.description}</div>
                  <div className="mt-4 flex justify-between text-[10px] font-mono uppercase text-primary/60 tracking-widest">
                    <span>{event.locationName}</span>
                    <span>{event.type.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center text-primary border-b border-border/50 pb-3">
            <Users className="w-4 h-4 mr-3 opacity-70" />
            <h3 className="font-mono uppercase tracking-[0.2em] text-xs">Present Entities</h3>
          </div>
          {summary.presentNpcs.length === 0 ? (
            <div className="p-6 border border-border border-dashed text-muted-foreground font-mono text-xs uppercase tracking-widest text-center">
              No entities detected.
            </div>
          ) : (
            <div className="space-y-3">
              {summary.presentNpcs.map(npc => (
                <Link key={npc.id} href={`/npcs/${npc.id}`}>
                  <div className="block p-5 border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-serif text-xl group-hover:text-primary transition-colors">{npc.name}</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest border border-border px-2 py-1">{npc.emotionalState}</div>
                    </div>
                    <div className="text-muted-foreground font-mono text-xs truncate tracking-wide">
                      <span className="opacity-50 mr-2">ACTION:</span> {npc.currentActivity}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
