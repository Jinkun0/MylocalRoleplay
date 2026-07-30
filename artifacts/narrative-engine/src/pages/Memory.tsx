import { useListMemories } from '@workspace/api-client-react';
import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Memory() {
  const { data: memories = [], isLoading } = useListMemories({ limit: 100 });

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto space-y-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl font-serif text-primary">Global Memory Log</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
          Retained Knowledge & Impressions
        </p>
      </header>

      {isLoading ? (
        <div className="font-mono text-xs uppercase tracking-widest animate-pulse text-muted-foreground">Accessing neural banks...</div>
      ) : (
        <div className="grid gap-6">
          {memories.map(mem => (
            <div key={mem.id} className="p-6 border border-border bg-card/30 flex flex-col md:flex-row md:items-start md:space-x-8 hover:border-primary/30 transition-colors group">
              <div className="w-56 shrink-0 flex flex-col space-y-3 mb-6 md:mb-0">
                <div className="text-xs font-mono uppercase text-primary/80 tracking-widest">Day {mem.worldDay} — {mem.worldTime}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest border border-border px-3 py-1.5 inline-block text-center w-max bg-card">
                  {mem.ownerType}: {mem.ownerId === 0 ? 'Global' : mem.ownerId}
                </div>
                <div className={cn(
                  "text-[10px] font-mono uppercase tracking-widest mt-2",
                  mem.importance === 'critical' ? "text-destructive" :
                  mem.importance === 'high' ? "text-primary" : "text-muted-foreground"
                )}>
                  Priority: {mem.importance}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                  {mem.isLongTerm ? 'Long-term Storage' : 'Volatile Memory'}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <BrainCircuit className="w-4 h-4 text-primary mr-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {mem.subjectName ? `Subject: ${mem.subjectName}` : 'General Entry'}
                  </span>
                </div>
                <p className="font-serif text-xl leading-relaxed text-foreground">{mem.content}</p>
              </div>
            </div>
          ))}
          {memories.length === 0 && (
            <div className="p-12 border border-border border-dashed text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">
              No memory segments found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
