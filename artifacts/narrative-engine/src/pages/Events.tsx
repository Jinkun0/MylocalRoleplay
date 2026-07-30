import { useListEvents } from '@workspace/api-client-react';
import { useState } from 'react';
import { Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Events() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data: page, isLoading } = useListEvents({ limit: 100, type: typeFilter || undefined });

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-8 space-y-6 md:space-y-0">
        <div>
          <h1 className="text-4xl font-serif text-primary">Event Chronology</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
            Historical & Ongoing Occurrences
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            className="bg-card border border-border text-foreground font-mono text-xs tracking-widest uppercase p-3 focus:border-primary focus:outline-none"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="random">Random</option>
            <option value="plot">Plot</option>
            <option value="social">Social</option>
            <option value="consequence">Consequence</option>
            <option value="player_action">Player Action</option>
            <option value="npc_action">NPC Action</option>
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="font-mono animate-pulse text-muted-foreground uppercase text-xs tracking-widest">Compiling historical records...</div>
      ) : (
        <div className="space-y-8 border-l border-border/30 ml-3 pl-8 relative">
          {page?.events.map(event => (
            <div key={event.id} className="relative group">
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-[37.5px] top-5 w-2 h-2 rounded-full border border-background",
                event.isActive ? "bg-primary shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-border group-hover:bg-muted-foreground transition-colors"
              )} />
              
              <div className={cn(
                "p-6 border bg-card/30 transition-colors",
                event.isActive ? "border-primary/40" : "border-border hover:border-muted-foreground/50"
              )}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 space-y-4 md:space-y-0">
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                    <span className="flex items-center text-primary/80"><Clock className="w-3 h-3 mr-2"/> Day {event.worldDay}</span>
                    <span className="opacity-30">•</span>
                    <span>{event.worldTime}</span>
                    <span className="opacity-30">•</span>
                    <span className="text-foreground">{event.locationName}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 border border-border bg-card">
                    {event.type.replace('_', ' ')}
                  </span>
                </div>
                
                <h3 className="text-2xl font-serif text-foreground mb-3 group-hover:text-primary transition-colors">{event.title}</h3>
                <p className="text-muted-foreground font-serif text-lg leading-relaxed">{event.description}</p>
                
                {event.isActive && (
                  <div className="mt-6 text-[10px] font-mono uppercase text-primary tracking-[0.2em] flex items-center bg-primary/5 border border-primary/10 px-3 py-2 w-max">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 animate-pulse" />
                    Status: Ongoing
                  </div>
                )}
              </div>
            </div>
          ))}
          {page?.events.length === 0 && (
            <div className="text-muted-foreground font-mono text-xs uppercase tracking-widest">No events logged.</div>
          )}
        </div>
      )}
    </div>
  );
}
