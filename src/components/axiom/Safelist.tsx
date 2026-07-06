// ════════════════════════════════════════════════════════════════════════════
//  Tailwind Safelist — Dynamic Color Classes
//
//  Tailwind's content scanner only generates utility classes for color tokens
//  that appear as LITERAL strings in source files. When classes are constructed
//  dynamically (e.g. `bg-${engine.color}`), Tailwind can't detect them and the
//  classes get purged from the final CSS bundle.
//
//  This file contains literal class strings for every axiom color that is used
//  dynamically via template-literal construction but does NOT appear as a
//  literal string elsewhere in the codebase. Importing this file into the app
//  ensures Tailwind's scanner finds these strings and generates the utilities.
//
//  Colors covered: sapphire, silver, ruby, topaz, obsidian, neon-lime
//  (cyan, emerald, amber, violet, rose, amethyst already appear as literals
//  in other source files and don't need safelisting.)
//
//  This component renders nothing visible — it's a hidden div whose className
//  strings exist solely for Tailwind's scanner.
// ════════════════════════════════════════════════════════════════════════════

export function Safelist() {
  return (
    <div className="hidden" aria-hidden="true">
      {/* axiom-sapphire (Solid-Blue — Codex engine) */}
      <span className="bg-axiom-sapphire text-axiom-sapphire border-axiom-sapphire" />
      <span className="bg-axiom-sapphire/10 bg-axiom-sapphire/15 bg-axiom-sapphire/20 bg-axiom-sapphire/30 bg-axiom-sapphire/40 bg-axiom-sapphire/50 bg-axiom-sapphire/60" />
      <span className="text-axiom-sapphire/30 text-axiom-sapphire/40 text-axiom-sapphire/50 text-axiom-sapphire/60 text-axiom-sapphire/70 text-axiom-sapphire/80 text-axiom-sapphire/90" />
      <span className="border-axiom-sapphire/30 border-axiom-sapphire/40 border-axiom-sapphire/50" />

      {/* axiom-silver (Metallic Silver — FreeClaude Code engine) */}
      <span className="bg-axiom-silver text-axiom-silver border-axiom-silver" />
      <span className="bg-axiom-silver/10 bg-axiom-silver/15 bg-axiom-silver/20 bg-axiom-silver/30 bg-axiom-silver/40 bg-axiom-silver/50 bg-axiom-silver/60" />
      <span className="text-axiom-silver/30 text-axiom-silver/40 text-axiom-silver/50 text-axiom-silver/60 text-axiom-silver/70 text-axiom-silver/80 text-axiom-silver/90" />
      <span className="border-axiom-silver/30 border-axiom-silver/40 border-axiom-silver/50" />

      {/* axiom-ruby (Deep Red) */}
      <span className="bg-axiom-ruby text-axiom-ruby border-axiom-ruby" />
      <span className="bg-axiom-ruby/10 bg-axiom-ruby/15 bg-axiom-ruby/20 bg-axiom-ruby/30 bg-axiom-ruby/40 bg-axiom-ruby/50 bg-axiom-ruby/60" />
      <span className="text-axiom-ruby/30 text-axiom-ruby/40 text-axiom-ruby/50 text-axiom-ruby/60 text-axiom-ruby/70 text-axiom-ruby/80 text-axiom-ruby/90" />
      <span className="border-axiom-ruby/30 border-axiom-ruby/40 border-axiom-ruby/50" />

      {/* axiom-topaz (Teal-Cyan) */}
      <span className="bg-axiom-topaz text-axiom-topaz border-axiom-topaz" />
      <span className="bg-axiom-topaz/10 bg-axiom-topaz/15 bg-axiom-topaz/20 bg-axiom-topaz/30 bg-axiom-topaz/40 bg-axiom-topaz/50 bg-axiom-topaz/60" />
      <span className="text-axiom-topaz/30 text-axiom-topaz/40 text-axiom-topaz/50 text-axiom-topaz/60 text-axiom-topaz/70 text-axiom-topaz/80 text-axiom-topaz/90" />
      <span className="border-axiom-topaz/30 border-axiom-topaz/40 border-axiom-topaz/50" />

      {/* axiom-obsidian (Dark Slate) */}
      <span className="bg-axiom-obsidian text-axiom-obsidian border-axiom-obsidian" />
      <span className="bg-axiom-obsidian/10 bg-axiom-obsidian/15 bg-axiom-obsidian/20 bg-axiom-obsidian/30 bg-axiom-obsidian/40 bg-axiom-obsidian/50 bg-axiom-obsidian/60" />
      <span className="text-axiom-obsidian/30 text-axiom-obsidian/40 text-axiom-obsidian/50 text-axiom-obsidian/60 text-axiom-obsidian/70 text-axiom-obsidian/80 text-axiom-obsidian/90" />
      <span className="border-axiom-obsidian/30 border-axiom-obsidian/40 border-axiom-obsidian/50" />

      {/* axiom-neon-lime (Electric Green) */}
      <span className="bg-axiom-neon-lime text-axiom-neon-lime border-axiom-neon-lime" />
      <span className="bg-axiom-neon-lime/10 bg-axiom-neon-lime/15 bg-axiom-neon-lime/20 bg-axiom-neon-lime/30 bg-axiom-neon-lime/40 bg-axiom-neon-lime/50 bg-axiom-neon-lime/60" />
      <span className="text-axiom-neon-lime/30 text-axiom-neon-lime/40 text-axiom-neon-lime/50 text-axiom-neon-lime/60 text-axiom-neon-lime/70 text-axiom-neon-lime/80 text-axiom-neon-lime/90" />
      <span className="border-axiom-neon-lime/30 border-axiom-neon-lime/40 border-axiom-neon-lime/50" />

      {/* axiom-graphite (Dark Neutral Gray — SiliconFlow) */}
      <span className="bg-axiom-graphite text-axiom-graphite border-axiom-graphite" />
      <span className="bg-axiom-graphite/10 bg-axiom-graphite/15 bg-axiom-graphite/20 bg-axiom-graphite/30 bg-axiom-graphite/40 bg-axiom-graphite/50 bg-axiom-graphite/60" />
      <span className="text-axiom-graphite/30 text-axiom-graphite/40 text-axiom-graphite/50 text-axiom-graphite/60 text-axiom-graphite/70 text-axiom-graphite/80 text-axiom-graphite/90" />
      <span className="border-axiom-graphite/30 border-axiom-graphite/40 border-axiom-graphite/50" />

      {/* axiom-navy (Deep Blue/Navy — DeepSeek) */}
      <span className="bg-axiom-navy text-axiom-navy border-axiom-navy" />
      <span className="bg-axiom-navy/10 bg-axiom-navy/15 bg-axiom-navy/20 bg-axiom-navy/30 bg-axiom-navy/40 bg-axiom-navy/50 bg-axiom-navy/60" />
      <span className="text-axiom-navy/30 text-axiom-navy/40 text-axiom-navy/50 text-axiom-navy/60 text-axiom-navy/70 text-axiom-navy/80 text-axiom-navy/90" />
      <span className="border-axiom-navy/30 border-axiom-navy/40 border-axiom-navy/50" />
    </div>
  );
}

export default Safelist;
