import { useParams } from 'wouter';
import { useGetNpc, useGetNpcRelationships, useGetNpcMemory, getGetNpcQueryKey, getGetNpcRelationshipsQueryKey, getGetNpcMemoryQueryKey } from '@workspace/api-client-react';
import { User, Activity, MapPin, Eye, Brain, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NpcProfile() {
  const params = useParams();
  const id = Number(params.id);

  const { data: npc, isLoading: npcLoading } = useGetNpc(id, { query: { queryKey: getGetNpcQueryKey(id), enabled: !!id } });
  const { data: relationships = [] } = useGetNpcRelationships(id, { query: { queryKey: getGetNpcRelationshipsQueryKey(id), enabled: !!id } });
  const { data: memories = [] } = useGetNpcMemory(id, { query: { queryKey: getGetNpcMemoryQueryKey(id), enabled: !!id } });

  if (npcLoading) return <div className="p-12 font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Decrypting entity data...</div>;
  if (!npc) return <div className="p-12 text-destructive font-mono uppercase tracking-widest">Entity record not found.</div>;

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-6xl mx-auto space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-start justify-between border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-5xl font-serif text-primary">{npc.name}</h1>
          <div className="flex flex-wrap items-center gap-6 mt-6 text-muted-foreground font-mono text-xs uppercase tracking-widest">
            <span className="flex items-center text-primary/80"><MapPin className="w-4 h-4 mr-2"/> {npc.locationName}</span>
            <span className="flex items-center"><Activity className="w-4 h-4 mr-2 opacity-50"/> {npc.emotionalState}</span>
            {npc.age !== null && <span className="opacity-70">Age {npc.age}</span>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-6 flex items-center">
              <User className="w-4 h-4 mr-3 opacity-70" /> Psychological Profile
            </h2>
            <div className="p-8 bg-card/30 border border-border text-foreground font-serif text-xl leading-loose">
              {npc.personality}
              {npc.background && (
                <div className="mt-6 pt-6 border-t border-border/50 text-muted-foreground text-lg leading-relaxed">
                  {npc.background}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-6 flex items-center">
              <Activity className="w-4 h-4 mr-3 opacity-70" /> Current Directive
            </h2>
            <div className="p-6 bg-primary/5 border border-primary/20 text-primary font-mono text-sm tracking-wide leading-relaxed relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
              {npc.currentRoutine}
            </div>
          </section>

          {npc.knownSecrets && npc.knownSecrets.length > 0 && (
            <section>
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-destructive mb-6 flex items-center">
                <Eye className="w-4 h-4 mr-3 opacity-70" /> Classified Intel
              </h2>
              <ul className="space-y-3 font-mono text-sm tracking-wide">
                {npc.knownSecrets.map((secret, i) => (
                  <li key={i} className="p-5 border border-destructive/30 bg-destructive/5 text-destructive-foreground relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive/50" />
                    {secret}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-6 flex items-center">
              <Brain className="w-4 h-4 mr-3 opacity-70" /> Memory Matrix
            </h2>
            <div className="space-y-4">
              {memories.length === 0 ? (
                <div className="p-6 border border-border border-dashed text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">No memories recorded.</div>
              ) : (
                memories.map(mem => (
                  <div key={mem.id} className="p-6 border border-border bg-card/30 flex flex-col group hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Day {mem.worldDay} — {mem.worldTime}</span>
                      <span className={cn(
                        "text-[10px] font-mono uppercase px-2 py-1 tracking-widest border",
                        mem.importance === 'critical' ? "border-destructive text-destructive bg-destructive/5" :
                        mem.importance === 'high' ? "border-primary text-primary bg-primary/5" :
                        "border-border text-muted-foreground"
                      )}>{mem.importance}</span>
                    </div>
                    <p className="font-serif text-lg leading-relaxed text-foreground">{mem.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-6">Core Objectives</h2>
            <ul className="space-y-3">
              {npc.objectives.length === 0 ? (
                <li className="text-muted-foreground font-mono text-xs tracking-widest uppercase">No defined objectives.</li>
              ) : (
                npc.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start font-mono text-sm tracking-wide border-l-2 border-primary/30 pl-4 py-2 bg-card/10">
                    {obj}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-6 flex items-center">
              <HeartPulse className="w-4 h-4 mr-3 opacity-70" /> Social Network
            </h2>
            <div className="space-y-4">
              {relationships.length === 0 ? (
                <div className="text-muted-foreground font-mono text-xs tracking-widest uppercase p-4 border border-border border-dashed text-center">Isolated entity.</div>
              ) : (
                relationships.map(rel => (
                  <div key={rel.id} className="p-5 border border-border bg-card/30">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-serif text-xl">{rel.npcName}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-primary border border-primary/20 px-2 py-1 bg-primary/5">{rel.status}</span>
                    </div>
                    <div className="space-y-2 font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
                      <div className="flex justify-between border-b border-border/50 pb-1"><span>Trust</span><span className={rel.trust >= 0 ? "text-primary" : "text-destructive"}>{rel.trust}</span></div>
                      <div className="flex justify-between pt-1"><span>Respect</span><span className={rel.respect >= 0 ? "text-primary" : "text-destructive"}>{rel.respect}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
