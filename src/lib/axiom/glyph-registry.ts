// ═══════════════════════════════════════════════════════════════════════════
// Agent Forge — Comprehensive Glyph Registry
// Each glyph is mapped to semantic keywords for auto-selection during
// the agent creation flow. The "forges" system parses agent descriptions
// and matches the most relevant glyph.
// ═══════════════════════════════════════════════════════════════════════════

export interface GlyphEntry {
  emoji: string;
  keywords: string[];
  /** Optional thematic color hint (one of the axiom-* color names). */
  colorHint?: string;
  /** Hex color that complements this glyph. */
  hexHint?: string;
}

export interface GlyphCategory {
  id: string;
  label: string;
  icon: string;
  glyphs: GlyphEntry[];
}

export const GLYPH_REGISTRY: GlyphCategory[] = [
  {
    id: "celestial-nature",
    label: "Celestial & Nature",
    icon: "🌟",
    glyphs: [
      { emoji: "🌞", keywords: ["sun", "solar", "light", "bright", "day", "warm", "energy", "power"], hexHint: "#f59e0b" },
      { emoji: "🌜", keywords: ["moon", "night", "dark", "lunar", "sleep", "dream", "rest", "calm"], hexHint: "#8b5cf6" },
      { emoji: "🌩", keywords: ["storm", "thunder", "weather", "electric", "lightning", "chaos", "power"], hexHint: "#06b6d4" },
      { emoji: "🌊", keywords: ["ocean", "water", "sea", "wave", "flow", "deep", "fluid", "stream"], hexHint: "#06b6d4" },
      { emoji: "🌀", keywords: ["vortex", "spiral", "cycle", "loop", "infinity", "rotation", "spin"], hexHint: "#a855f7" },
      { emoji: "🔥", keywords: ["fire", "hot", "burn", "passion", "intense", "flame", "heat", "spark"], hexHint: "#e11d48" },
      { emoji: "⛄", keywords: ["snow", "cold", "winter", "ice", "frost", "freeze", "cool", "chill"], hexHint: "#06b6d4" },
      { emoji: "❄", keywords: ["ice", "crystal", "frost", "frozen", "shard", "cold", "pure", "sharp"], hexHint: "#06b6d4" },
      { emoji: "⭐", keywords: ["star", "rating", "review", "favorite", "featured", "top", "best", "quality"], hexHint: "#f59e0b" },
      { emoji: "☁", keywords: ["cloud", "sky", "float", "soft", "air", "remote", "hosting", "server"], hexHint: "#94a3b8" },
      { emoji: "🌌", keywords: ["galaxy", "space", "universe", "cosmos", "infinite", "vast", "exploration"], hexHint: "#8b5cf6" },
      { emoji: "🪐", keywords: ["planet", "orbit", "satellite", "global", "world", "earth", "system"], hexHint: "#06b6d4" },
      { emoji: "🌍", keywords: ["earth", "global", "world", "international", "geo", "map", "location", "environment"], hexHint: "#10b981" },
      { emoji: "", keywords: ["dim", "low", "reduce", "subtle", "minimal", "fade", "soft"], hexHint: "#94a3b8" },
    ],
  },
  {
    id: "transport-tech",
    label: "Transport & Tech",
    icon: "🚀",
    glyphs: [
      { emoji: "⚓", keywords: ["anchor", "stable", "root", "base", "foundation", "secure", "dock", "port"], hexHint: "#1e293b" },
      { emoji: "⛵", keywords: ["sail", "ship", "navigate", "voyage", "journey", "cruise", "maritime"], hexHint: "#06b6d4" },
      { emoji: "🛰", keywords: ["satellite", "signal", "communication", "broadcast", "orbit", "space", "remote"], hexHint: "#06b6d4" },
      { emoji: "🛸", keywords: ["ufo", "alien", "advanced", "futuristic", "mysterious", "sci-fi", "innovation"], hexHint: "#a855f7" },
      { emoji: "🚀", keywords: ["rocket", "launch", "fast", "speed", "deploy", "startup", "growth", "accelerate"], hexHint: "#e11d48" },
      { emoji: "🚔", keywords: ["police", "security", "patrol", "law", "enforce", "guard", "protect", "monitor"], hexHint: "#2563eb" },
      { emoji: "🚑", keywords: ["ambulance", "emergency", "medical", "health", "rescue", "urgent", "critical", "care"], hexHint: "#e11d48" },
      { emoji: "🚒", keywords: ["fire", "emergency", "alert", "danger", "rescue", "response", "safety", "protect"], hexHint: "#e11d48" },
      { emoji: "☎", keywords: ["phone", "call", "voice", "contact", "communicate", "dial", "ring", "support"], hexHint: "#10b981" },
      { emoji: "🎮", keywords: ["game", "gaming", "play", "fun", "entertainment", "interactive", "player", "score"], hexHint: "#a855f7" },
      { emoji: "🕹", keywords: ["joystick", "control", "arcade", "retro", "game", "play", "manipulate", "steer"], hexHint: "#a855f7" },
      { emoji: "🤖", keywords: ["robot", "bot", "ai", "automate", "machine", "agent", "artificial", "intelligent"], hexHint: "#06b6d4" },
      { emoji: "🧭", keywords: ["compass", "direction", "navigate", "guide", "orient", "explore", "path", "find"], hexHint: "#e11d48" },
      { emoji: "♟", keywords: ["chess", "strategy", "think", "plan", "tactical", "smart", "logic", "intelligent"], hexHint: "#1e293b" },
      { emoji: "🎬", keywords: ["movie", "film", "video", "cinema", "director", "scene", "media", "production"], hexHint: "#e11d48" },
      { emoji: "📽", keywords: ["projector", "film", "retro", "classic", "display", "presentation", "show", "screen"], hexHint: "#f59e0b" },
      { emoji: "📷", keywords: ["camera", "photo", "image", "picture", "capture", "photography", "snapshot", "visual"], hexHint: "#f59e0b" },
      { emoji: "💡", keywords: ["idea", "light", "innovation", "think", "insight", "creative", "brainstorm", "inspire"], hexHint: "#f59e0b" },
      { emoji: "✈", keywords: ["airplane", "fly", "travel", "fast", "air", "jet", "flight", "global"], hexHint: "#06b6d4" },
      { emoji: "🚁", keywords: ["helicopter", "fly", "hover", "air", "rotor", "aerial", "scan", "surveillance"], hexHint: "#2563eb" },
      { emoji: "🚂", keywords: ["train", "rail", "transport", "track", "route", "pipeline", "schedule", "logistics"], hexHint: "#f59e0b" },
    ],
  },
  {
    id: "artifacts-magic",
    label: "Artifacts & Magic",
    icon: "🔮",
    glyphs: [
      { emoji: "🗿", keywords: ["stone", "ancient", "monument", "legacy", "solid", "permanent", "structure", "foundation"], hexHint: "#f59e0b" },
      { emoji: "💸", keywords: ["money", "finance", "pay", "cash", "cost", "budget", "invest", "price", "dollar"], hexHint: "#10b981" },
      { emoji: "🧿", keywords: ["evil eye", "protect", "watch", "ward", "curse", "charm", "mystic", "luck"], hexHint: "#06b6d4" },
      { emoji: "👑", keywords: ["king", "queen", "royal", "premium", "elite", "boss", "leader", "chief", "manager"], hexHint: "#f59e0b" },
      { emoji: "🎃", keywords: ["pumpkin", "halloween", "spooky", "fun", "creative", "seasonal", "autumn", "harvest"], hexHint: "#f59e0b" },
      { emoji: "🔮", keywords: ["crystal ball", "predict", "forecast", "future", "oracle", "prophecy", "vision", "insight"], hexHint: "#a855f7" },
      { emoji: "🧩", keywords: ["puzzle", "piece", "solve", "assemble", "fit", "compose", "integrate", "build"], hexHint: "#a855f7" },
      { emoji: "🧸", keywords: ["teddy", "bear", "cute", "friendly", "soft", "comfort", "child", "toy", "warm"], hexHint: "#f59e0b" },
      { emoji: "🔒", keywords: ["lock", "secure", "private", "encrypt", "protect", "password", "safe", "access"], hexHint: "#e11d48" },
      { emoji: "⚙", keywords: ["gear", "settings", "config", "mechanical", "engineering", "system", "process", "tune"], hexHint: "#94a3b8" },
      { emoji: "⚔", keywords: ["sword", "fight", "battle", "war", "compete", "challenge", "attack", "defend", "warrior"], hexHint: "#e11d48" },
      { emoji: "🧲", keywords: ["magnet", "attract", "pull", "draw", "connect", "bind", "link", "unite"], hexHint: "#e11d48" },
      { emoji: "💣", keywords: ["bomb", "explosive", "impact", "powerful", "destroy", "breaking", "disrupt", "force"], hexHint: "#e11d48" },
      { emoji: "💰", keywords: ["money bag", "wealth", "profit", "rich", "treasure", "earn", "revenue", "income"], hexHint: "#10b981" },
      { emoji: "🧠", keywords: ["brain", "think", "mind", "intelligence", "memory", "learn", "cognitive", "smart", "reason"], hexHint: "#a855f7" },
      { emoji: "🎨", keywords: ["art", "design", "creative", "paint", "draw", "color", "aesthetic", "visual", "style"], hexHint: "#f43f5e" },
      { emoji: "🥊", keywords: ["boxing", "fight", "punch", "combat", "train", "strong", "tough", "resilient"], hexHint: "#e11d48" },
      { emoji: "⚗", keywords: ["alembic", "chemistry", "science", "experiment", "mix", "brew", "formula", "transform"], hexHint: "#10b981" },
      { emoji: "⚖", keywords: ["balance", "justice", "fair", "equal", "weigh", "compare", "evaluate", "judge", "legal"], hexHint: "#06b6d4" },
      { emoji: "🛡", keywords: ["shield", "protect", "defense", "guard", "security", "armor", "safe", "defend"], hexHint: "#2563eb" },
      { emoji: "🏹", keywords: ["bow", "arrow", "target", "aim", "precision", "focus", "shoot", "direct", "accurate"], hexHint: "#10b981" },
      { emoji: "📚", keywords: ["book", "library", "read", "learn", "study", "knowledge", "education", "reference", "docs"], hexHint: "#f59e0b" },
      { emoji: "⏳", keywords: ["hourglass", "time", "timer", "schedule", "deadline", "wait", "patience", "urgent"], hexHint: "#f59e0b" },
      { emoji: "🛒", keywords: ["cart", "shop", "buy", "purchase", "store", "ecommerce", "retail", "order"], hexHint: "#10b981" },
      { emoji: "✒", keywords: ["pen", "write", "edit", "draft", "compose", "sign", "author", "text"], hexHint: "#1e293b" },
      { emoji: "💼", keywords: ["briefcase", "business", "work", "professional", "office", "corporate", "job", "career"], hexHint: "#1e293b" },
    ],
  },
  {
    id: "mystical-creatures",
    label: "Mystical & Creatures",
    icon: "🐉",
    glyphs: [
      { emoji: "🧞‍♂️", keywords: ["genie", "wish", "magic", "grant", "desire", "summon", " mystical", "spirit"], hexHint: "#06b6d4" },
      { emoji: "🧞‍♀️", keywords: ["genie", "fairy", "magic", "wish", "enchant", "spirit", "female", "mystical"], hexHint: "#a855f7" },
      { emoji: "🐱‍👤", keywords: ["cat", "ninja", "stealth", "secret", "spy", "hidden", "covert", "sneak"], hexHint: "#1e293b" },
      { emoji: "👾", keywords: ["alien", "invader", "retro", "game", "pixel", "digital", "bug", "glitch"], hexHint: "#10b981" },
      { emoji: "😈", keywords: ["devil", "evil", "dark", "trick", "malicious", "hacker", "naughty", "chaos"], hexHint: "#e11d48" },
      { emoji: "👹", keywords: ["ogre", "monster", "scary", "fierce", "brute", "troll", "demon", "beast"], hexHint: "#f59e0b" },
      { emoji: "👺", keywords: ["goblin", "troll", "trickster", "mischievous", "myth", "folklore", "spirit"], hexHint: "#e11d48" },
      { emoji: "👽", keywords: ["alien", "extraterrestrial", "unknown", "mystery", "stranger", "visitor", "sci-fi"], hexHint: "#10b981" },
      { emoji: "👻", keywords: ["ghost", "spirit", "phantom", "invisible", "hidden", "haunt", "soul", "memory"], hexHint: "#94a3b8" },
      { emoji: "🦄", keywords: ["unicorn", "magic", "rare", "special", "unique", "fantasy", "wonder", "dream"], hexHint: "#a855f7" },
      { emoji: "🐲", keywords: ["dragon", "power", "myth", "legend", "strength", "ancient", "wise", "fire"], hexHint: "#e11d48" },
      { emoji: "☠", keywords: ["skull", "danger", "death", "toxic", "warning", "poison", "hazard", "critical"], hexHint: "#e11d48" },
      { emoji: "💩", keywords: ["poop", "joke", "funny", "troll", "meme", "humor", "silly", "gag"], hexHint: "#f59e0b" },
      { emoji: "🧙‍♂️", keywords: ["wizard", "mage", "magic", "spell", "enchant", "wise", "mentor", "teacher", "powerful"], hexHint: "#06b6d4" },
      { emoji: "🦹‍♂️", keywords: ["villain", "antagonist", "supervillain", "evil", "dark", "nemesis", "rival"], hexHint: "#1e293b" },
      { emoji: "🤡", keywords: ["clown", "joker", "funny", "entertain", "circus", "comedy", "humor", "silly"], hexHint: "#e11d48" },
    ],
  },
  {
    id: "flora",
    label: "Flora",
    icon: "🌿",
    glyphs: [
      { emoji: "🧻", keywords: ["paper", "wipe", "clean", "tissue", "roll", "document", "note"], hexHint: "#f5f5f4" },
      { emoji: "☘", keywords: ["clover", "luck", "green", "nature", "simple", "small", "humble"], hexHint: "#10b981" },
      { emoji: "🍀", keywords: ["four leaf", "lucky", "fortune", "rare", "chance", "serendipity", "luck"], hexHint: "#10b981" },
      { emoji: "🌳", keywords: ["tree", "growth", "nature", "branch", "root", "forest", "organic", "ecosystem"], hexHint: "#10b981" },
      { emoji: "🌸", keywords: ["blossom", "flower", "spring", "beautiful", "gentle", "pretty", "bloom", "fragile"], hexHint: "#f43f5e" },
      { emoji: "🍄", keywords: ["mushroom", "fungus", "grow", "organic", "nature", "poison", "magical", "spore"], hexHint: "#e11d48" },
      { emoji: "🍁", keywords: ["maple", "leaf", "autumn", "fall", "change", "season", "warm", "red"], hexHint: "#f59e0b" },
      { emoji: "🌵", keywords: ["cactus", "desert", "survive", "tough", "resilient", "dry", "spike", "durable"], hexHint: "#10b981" },
    ],
  },
  {
    id: "fauna-insects-sea",
    label: "Fauna — Insects & Sea",
    icon: "🦋",
    glyphs: [
      { emoji: "🦋", keywords: ["butterfly", "transform", "metamorphosis", "change", "beauty", "evolve", "wings", "delicate"], hexHint: "#a855f7" },
      { emoji: "🐚", keywords: ["shell", "ocean", "beach", "treasure", "spiral", "protect", "coastal", "pearl"], hexHint: "#f59e0b" },
      { emoji: "🕸", keywords: ["spider web", "network", "connect", "trap", "web", "internet", "link", "mesh"], hexHint: "#94a3b8" },
      { emoji: "🕷", keywords: ["spider", "crawl", "scrape", "web", "spider", "hunt", "patient", "weave"], hexHint: "#1e293b" },
      { emoji: "🦂", keywords: ["scorpion", "danger", "venom", "sting", "desert", "fierce", "strike", "defend"], hexHint: "#f59e0b" },
      { emoji: "🐙", keywords: ["octopus", "tentacle", "multi", "flexible", "smart", "adapt", "ocean", "grasp"], hexHint: "#a855f7" },
      { emoji: "🦞", keywords: ["lobster", "crustacean", "seafood", "red", "premium", "delicacy", "claw", "strong"], hexHint: "#e11d48" },
      { emoji: "🦀", keywords: ["crab", "sideways", "lateral", "shell", "beach", "ocean", "protect", "crawl"], hexHint: "#e11d48" },
      { emoji: "🐛", keywords: ["bug", "insect", "worm", "caterpillar", "larva", "small", "crawl", "debug"], hexHint: "#10b981" },
      { emoji: "🐞", keywords: ["ladybug", "lucky", "cute", "small", "red", "dot", "garden", "friendly"], hexHint: "#e11d48" },
      { emoji: "🦐", keywords: ["shrimp", "small", "sea", "food", "tiny", "pink", "delicate", "shell"], hexHint: "#f43f5e" },
      { emoji: "🐠", keywords: ["fish", "tropical", "ocean", "swim", "water", "colorful", "aquatic", "reef"], hexHint: "#06b6d4" },
      { emoji: "🐉", keywords: ["dragon", "chinese", "mythical", "power", "fortune", "auspicious", "legend", "strength"], hexHint: "#e11d48" },
      { emoji: "🐍", keywords: ["snake", "slither", "danger", "wisdom", "reptile", "coil", "shed", "transform"], hexHint: "#10b981" },
      { emoji: "🐌", keywords: ["snail", "slow", "patient", "shell", "garden", "trail", "persistent", "steady"], hexHint: "#10b981" },
      { emoji: "🦈", keywords: ["shark", "predator", "aggressive", "ocean", "hunter", "fast", "dangerous", "apex"], hexHint: "#1e293b" },
      { emoji: "🐬", keywords: ["dolphin", "smart", "friendly", "ocean", "play", "communicate", "social", "intelligent"], hexHint: "#06b6d4" },
      { emoji: "🐳", keywords: ["whale", "ocean", "large", "deep", "massive", "gentle", "blue", "mammal"], hexHint: "#2563eb" },
    ],
  },
  {
    id: "fauna-birds",
    label: "Fauna — Birds",
    icon: "🦅",
    glyphs: [
      { emoji: "🦚", keywords: ["peacock", "proud", "display", "beautiful", "elegant", "show", "extravagant", "fancy"], hexHint: "#10b981" },
      { emoji: "🦉", keywords: ["owl", "wise", "night", "watch", "observe", "learn", "scholar", "silent", "knowledge"], hexHint: "#f59e0b" },
      { emoji: "🦢", keywords: ["swan", "elegant", "graceful", "beautiful", "pure", "white", "lake", "peaceful"], hexHint: "#f5f5f4" },
      { emoji: "🦜", keywords: ["parrot", "talk", "speak", "colorful", "mimic", "repeat", "voice", "copy"], hexHint: "#10b981" },
      { emoji: "🐣", keywords: ["chick", "hatch", "new", "begin", "start", "baby", "small", "emerge", "birth"], hexHint: "#f59e0b" },
      { emoji: "🦅", keywords: ["eagle", "freedom", "soar", "sharp", "vision", "apex", "patriot", "power", "hunt"], hexHint: "#f59e0b" },
      { emoji: "🦩", keywords: ["flamingo", "pink", "elegant", "tropical", "standout", "unique", "stylish", "flock"], hexHint: "#f43f5e" },
      { emoji: "🐓", keywords: ["rooster", "crow", "morning", "wake", "alert", "dawn", "announce", "loud"], hexHint: "#e11d48" },
      { emoji: "🦆", keywords: ["duck", "water", "swim", "simple", "quack", "pond", "calm", "float"], hexHint: "#10b981" },
      { emoji: "🐦", keywords: ["bird", "fly", "tweet", "social", "chirp", "small", "sky", "free", "message"], hexHint: "#06b6d4" },
      { emoji: "🐧", keywords: ["penguin", "cold", "ice", "formal", "suit", "arctic", "waddle", "cute"], hexHint: "#1e293b" },
      { emoji: "🐥", keywords: ["chick", "baby", "small", "cute", "yellow", "tiny", "new", "innocent"], hexHint: "#f59e0b" },
    ],
  },
  {
    id: "fauna-mammals",
    label: "Fauna — Mammals",
    icon: "🦁",
    glyphs: [
      { emoji: "🐱", keywords: ["cat", "feline", "independent", "agile", "sneaky", "pet", "curious", "clever"], hexHint: "#f59e0b" },
      { emoji: "🐵", keywords: ["monkey", "primate", "smart", "playful", "climb", "mimic", "clever", "fun"], hexHint: "#f59e0b" },
      { emoji: "🐶", keywords: ["dog", "loyal", "friendly", "pet", "guard", "companion", "faithful", "alert"], hexHint: "#f59e0b" },
      { emoji: "🐺", keywords: ["wolf", "pack", "leader", "lone", "howl", "wild", "hunt", "team"], hexHint: "#94a3b8" },
      { emoji: "🦁", keywords: ["lion", "king", "brave", "courage", "leader", "roar", "pride", "strong", "royal"], hexHint: "#f59e0b" },
      { emoji: "🐅", keywords: ["tiger", "striped", "powerful", "stealth", "hunter", "fierce", "bold", "exotic"], hexHint: "#f59e0b" },
      { emoji: "🦒", keywords: ["giraffe", "tall", "overview", "perspective", "reach", "long", "unique", "observe"], hexHint: "#f59e0b" },
      { emoji: "🦊", keywords: ["fox", "clever", "smart", "sly", "crafty", "cunning", "quick", "witty"], hexHint: "#f59e0b" },
      { emoji: "🦝", keywords: ["raccoon", "mask", "curious", "nocturnal", "sneaky", "adaptive", "resourceful", "bandit"], hexHint: "#1e293b" },
      { emoji: "🐮", keywords: ["cow", "moo", "farm", "milk", "docile", "gentle", "produce", "calm"], hexHint: "#f5f5f4" },
      { emoji: "🐷", keywords: ["pig", "farm", "cute", "hungry", "eat", "pink", "round", "greedy"], hexHint: "#f43f5e" },
      { emoji: "🐗", keywords: ["boar", "wild", "fierce", "tough", "hunt", "charge", "rugged"], hexHint: "#8b5cf6" },
      { emoji: "🐭", keywords: ["mouse", "small", "quiet", "click", "computer", "tiny", "squeak", "hide"], hexHint: "#94a3b8" },
      { emoji: "🐹", keywords: ["hamster", "pet", "cute", "small", "wheel", "run", "fluffy", "round"], hexHint: "#f59e0b" },
      { emoji: "🐰", keywords: ["rabbit", "bunny", "fast", "quick", "hop", "cute", "multiply", "agile"], hexHint: "#f43f5e" },
      { emoji: "🐻", keywords: ["bear", "strong", "protect", "hibernate", "wild", "power", "guard", "fierce"], hexHint: "#f59e0b" },
      { emoji: "🐨", keywords: ["koala", "sleep", "calm", "australia", "cute", "eucalyptus", "chill", "lazy"], hexHint: "#94a3b8" },
      { emoji: "🐼", keywords: ["panda", "rare", "cute", "china", "black white", "gentle", "peace", "bamboo"], hexHint: "#1e293b" },
      { emoji: "🐸", keywords: ["frog", "jump", "leap", "amphibian", "croak", "green", "transform", "pond"], hexHint: "#10b981" },
      { emoji: "🦓", keywords: ["zebra", "stripe", "pattern", "africa", "unique", "distinct", "herd", "wild"], hexHint: "#1e293b" },
      { emoji: "🐴", keywords: ["horse", "ride", "fast", "power", "gallop", "race", "equestrian", "work"], hexHint: "#f59e0b" },
      { emoji: "🦧", keywords: ["orangutan", "primate", "ape", "jungle", "strong", "intelligent", "wild", "climb"], hexHint: "#f59e0b" },
      { emoji: "🦍", keywords: ["gorilla", "powerful", "strong", "silverback", "leader", "protect", "muscle"], hexHint: "#1e293b" },
      { emoji: "🐒", keywords: ["monkey", "primate", "swing", "play", "smart", "tree", "tropical", "agile"], hexHint: "#f59e0b" },
    ],
  },
  {
    id: "signs",
    label: "Signs",
    icon: "♈",
    glyphs: [
      { emoji: "♈", keywords: ["aries", "fire", "begin", "pioneer", "bold", "adventurous", "energetic", "impulse"], hexHint: "#e11d48" },
      { emoji: "♉", keywords: ["taurus", "earth", "stable", "patient", "reliable", "strong", "determined", "steady"], hexHint: "#10b981" },
      { emoji: "♊", keywords: ["gemini", "air", "dual", "communicate", "adapt", "versatile", "curious", "social"], hexHint: "#f59e0b" },
      { emoji: "♋", keywords: ["cancer", "water", "emotion", "protect", "nurture", "intuitive", "home", "care"], hexHint: "#06b6d4" },
      { emoji: "♌", keywords: ["leo", "fire", "creative", "proud", "leader", "dramatic", "generous", "confident"], hexHint: "#f59e0b" },
      { emoji: "♍", keywords: ["virgo", "earth", "analyze", "detail", "perfect", "organize", "practical", "helpful"], hexHint: "#10b981" },
      { emoji: "♎", keywords: ["libra", "air", "balance", "justice", "harmony", "beauty", "diplomatic", "fair"], hexHint: "#f43f5e" },
      { emoji: "♏", keywords: ["scorpio", "water", "intense", "passionate", "mysterious", "powerful", "secret", "transform"], hexHint: "#e11d48" },
      { emoji: "♐", keywords: ["sagittarius", "fire", "explore", "adventure", "optimistic", "free", "travel", "philosophy"], hexHint: "#a855f7" },
      { emoji: "♑", keywords: ["capricorn", "earth", "ambitious", "disciplined", "responsible", "patient", "structure", "goal"], hexHint: "#1e293b" },
      { emoji: "♒", keywords: ["aquarius", "air", "innovative", "humanitarian", "independent", "progressive", "rebel", "visionary"], hexHint: "#06b6d4" },
      { emoji: "♓", keywords: ["pisces", "water", "creative", "empathy", "intuitive", "dreamy", "spiritual", "artistic"], hexHint: "#a855f7" },
      { emoji: "⛎", keywords: ["ophiuchus", "serpent", "healer", "mystery", "rare", "hidden", "medical", "esoteric"], hexHint: "#10b981" },
    ],
  },
];

/** Flatten all glyphs for quick search */
export function getAllGlyphs(): GlyphEntry[] {
  return GLYPH_REGISTRY.flatMap((cat) => cat.glyphs);
}

/** Find the best matching glyph for a text description */
export function findBestGlyph(description: string): GlyphEntry | null {
  const lower = description.toLowerCase();
  const allGlyphs = getAllGlyphs();

  // Score each glyph by counting keyword matches
  let best: GlyphEntry | null = null;
  let bestScore = 0;

  for (const g of allGlyphs) {
    let score = 0;
    for (const kw of g.keywords) {
      // Exact word boundary match
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(lower)) score += 2;
      // Substring match (lower weight)
      else if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }

  return best;
}