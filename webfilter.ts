export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  severity: "high" | "medium" | "low";
  icon: string;
}

export const FILTER_CATEGORIES: CategoryDefinition[] = [
  {
    id: "adult",
    name: "Adult & Explicit Content",
    description: "Pornography, mature themes, and age-restricted sites",
    severity: "high",
    icon: "ShieldAlert",
  },
  {
    id: "gambling",
    name: "Gambling & Betting",
    description: "Casinos, sports betting, lottery, and loot boxes",
    severity: "high",
    icon: "Coins",
  },
  {
    id: "violence",
    name: "Violence & Weapons",
    description: "Guns, gore, hate speech, and dangerous weapons",
    severity: "high",
    icon: "Sword",
  },
  {
    id: "social",
    name: "Social Media & Feeds",
    description: "TikTok, Instagram, Snapchat, Facebook, Reddit",
    severity: "medium",
    icon: "Users",
  },
  {
    id: "gaming",
    name: "Online Gaming Portals",
    description: "Roblox, Discord, Steam, browser flash games",
    severity: "medium",
    icon: "Gamepad",
  },
  {
    id: "dating",
    name: "Dating & Meetups",
    description: "Tinder, Bumble, chat roulette, meetups",
    severity: "high",
    icon: "Heart",
  },
  {
    id: "unmoderated_chat",
    name: "Unmoderated Chat & P2P",
    description: "Omegle, random chatrooms, torrents",
    severity: "high",
    icon: "MessageSquareWarning",
  },
];

export const CURATED_SAFE_SITES = [
  {
    name: "NASA Kids’ Club",
    url: "https://www.nasa.gov/learning-resources/nasa-kids-club/",
    category: "Science & Space",
    icon: "🚀",
  },
  {
    name: "Khan Academy Kids",
    url: "https://www.khanacademy.org/",
    category: "Math & Learning",
    icon: "🎓",
  },
  { name: "PBS KIDS", url: "https://pbskids.org/", category: "Games & Shows", icon: "🐾" },
  {
    name: "National Geographic Kids",
    url: "https://kids.nationalgeographic.com/",
    category: "Nature & Animals",
    icon: "🦁",
  },
  {
    name: "Scratch Coding",
    url: "https://scratch.mit.edu/",
    category: "Creative Coding",
    icon: "🐱",
  },
  {
    name: "Smithsonian for Kids",
    url: "https://www.si.edu/kids",
    category: "History & Culture",
    icon: "🏛️",
  },
  { name: "Duolingo", url: "https://www.duolingo.com/", category: "Languages", icon: "🦉" },
  {
    name: "Wikipedia (Safe)",
    url: "https://en.wikipedia.org/wiki/Main_Page",
    category: "Encyclopedia",
    icon: "📚",
  },
];

const CATEGORY_DOMAIN_PATTERNS: Record<string, string[]> = {
  adult: [
    "pornhub",
    "xvideos",
    "onlyfans",
    "redtube",
    "chaturbate",
    "adult",
    "xxx",
    "hentai",
    "cam4",
    "playboy",
    "brazzers",
    "sex",
  ],
  gambling: [
    "bet365",
    "draftkings",
    "fanduel",
    "poker",
    "casino",
    "stake.com",
    "bovada",
    "slots",
    "betting",
    "lottery",
  ],
  violence: ["bestgore", "rotten.com", "gunbroker", "weapons", "knifebuy", "darknet"],
  social: [
    "tiktok.com",
    "instagram.com",
    "snapchat.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "tumblr.com",
  ],
  gaming: [
    "roblox.com",
    "discord.com",
    "twitch.tv",
    "steamcommunity.com",
    "miniclip.com",
    "crazygames.com",
    "poki.com",
  ],
  dating: [
    "tinder.com",
    "bumble.com",
    "hinge.co",
    "match.com",
    "badoo.com",
    "okcupid.com",
    "grindr.com",
  ],
  unmoderated_chat: [
    "omegle.com",
    "chatroulette.com",
    "tinychat.com",
    "emeraldchat.com",
    "monkey.app",
  ],
};

export interface WebFilterResult {
  allowed: boolean;
  blockedReason?: string;
  matchedCategory?: string;
  matchedRule?: string;
}

/**
 * Evaluates whether a given URL is allowed according to filter rules
 */
export function checkUrlAllowed(
  urlInput: string,
  blockedCategories: string[],
  blockedDomains: string[],
  allowedDomains: string[],
): WebFilterResult {
  let hostname = urlInput.trim().toLowerCase();
  try {
    if (!hostname.startsWith("http://") && !hostname.startsWith("https://")) {
      hostname = "https://" + hostname;
    }
    const parsed = new URL(hostname);
    hostname = parsed.hostname;
  } catch {
    // raw hostname
  }

  // Strip 'www.'
  hostname = hostname.replace(/^www\./, "");

  // 1. Check explicit whitelist first
  const isExplicitlyAllowed = allowedDomains.some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().replace(/^www\./, "");
    return hostname === cleanAllowed || hostname.endsWith("." + cleanAllowed);
  });

  if (isExplicitlyAllowed) {
    return { allowed: true };
  }

  // 2. Check explicit blacklist
  const isExplicitlyBlocked = blockedDomains.some((blocked) => {
    const cleanBlocked = blocked.toLowerCase().replace(/^www\./, "");
    return hostname === cleanBlocked || hostname.endsWith("." + cleanBlocked);
  });

  if (isExplicitlyBlocked) {
    return {
      allowed: false,
      blockedReason: `The domain "${hostname}" is explicitly blocked by parental rule.`,
      matchedRule: "custom_blacklist",
    };
  }

  // 3. Check categories
  for (const categoryId of blockedCategories) {
    const patterns = CATEGORY_DOMAIN_PATTERNS[categoryId] || [];
    for (const pattern of patterns) {
      if (hostname.includes(pattern)) {
        const catObj = FILTER_CATEGORIES.find((c) => c.id === categoryId);
        return {
          allowed: false,
          blockedReason: `Blocked under category: ${catObj?.name || categoryId}`,
          matchedCategory: categoryId,
          matchedRule: "category_rule",
        };
      }
    }
  }

  return { allowed: true };
}
