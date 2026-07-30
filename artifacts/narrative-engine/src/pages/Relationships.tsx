import { useListRelationships } from '@workspace/api-client-react';
import { Network } from 'lucide-react';

function StatBar({ label, value }: { label: string, value: number }) {
  const isPositive = value >= 0;
  const width = Math.abs(value);
  
  return (
    <div className="flex flex-col space-y-2 mb-4">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className={isPositive ? 'text-primary' : 'text-destructive'}>{value}</span>
      </div>
      <div className="h-1 w-full bg-card relative border-y border-border/50">
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-muted-foreground/30 z-10" />
        {isPositive ? (
          <div 
            className="absolute top-0 bottom-0 left-1/2 bg-primary/70 transition-all duration-1000"
            style={{ width: `${width / 2}%` }}
          />
        ) : (
          <div 
            className="absolute top-0 bottom-0 right-1/2 bg-destructive/70 transition-all duration-1000"
            style={{ width: `${width / 2}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function Relationships() {
  const { data: relationships = [], isLoading } = useListRelationships();

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-6xl mx-auto space-y-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl font-serif text-primary">Relationship Matrices</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
          Player Interactions & Status Vectors
        </p>
      </header>

      {isLoading ? (
        <div className="font-mono text-xs uppercase tracking-widest animate-pulse text-muted-foreground">Mapping social vectors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {relationships.map(rel => (
            <div key={rel.id} className="p-8 border border-border bg-card/30 hover:bg-card/50 transition-colors">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center">
                  <Network className="w-5 h-5 text-primary mr-4 opacity-70" />
                  <h2 className="font-serif text-3xl">{rel.npcName}</h2>
                </div>
                <div className="text-[10px] font-mono uppercase text-primary border border-primary/20 px-3 py-1.5 bg-primary/5 tracking-[0.2em]">
                  {rel.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                <StatBar label="Trust" value={rel.trust} />
                <StatBar label="Respect" value={rel.respect} />
                <StatBar label="Suspicion" value={rel.suspicion} />
                <StatBar label="Friendship" value={rel.friendship} />
                <div className="col-span-2 mt-4">
                  <StatBar label="Rivalry" value={rel.rivalry} />
                </div>
              </div>
              
              {rel.lastInteractionDay !== null && (
                <div className="mt-8 pt-4 border-t border-border/50 text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                  Last Contact: Day {rel.lastInteractionDay}
                </div>
              )}
            </div>
          ))}
          {relationships.length === 0 && (
            <div className="col-span-full p-12 border border-border border-dashed text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
              No known relationships established.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
