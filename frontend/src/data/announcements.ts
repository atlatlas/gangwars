export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  author?: string;
}

export const announcements: Announcement[] = [
  {
    id: "gang-attacks",
    title: "Gang Attacks & Public Profiles",
    body: "You can now view any gang's public profile — see their banner, description, level, and member list without joining. Non-gang members can request to join or invest directly from the profile page. Gang-on-gang warfare has arrived: launch Raids to steal vault cash or Sabotage to damage enemy reputation. Raid costs 10 turns and has a 24h cooldown; Sabotage costs vault cash and has a 12h cooldown. Combat power is calculated from member stats, arsenal equipment, and gang level.",
    date: "2026-05-16",
    author: "Dev Team",
  },
  {
    id: "gang-operations-fix",
    title: "Gang Operations Payout Fix",
    body: "Fixed a bug where gang operation payouts couldn't be collected after completing daily tasks. Pending payouts now correctly count tasks completed since the last collection. Daily task auto-tracking also now correctly maps to the operation you're assigned to rather than the gang's first active operation.",
    date: "2026-05-15",
    author: "Dev Team",
  },
  {
    id: "territory-influence",
    title: "Territory Influence System",
    body: "Territories now have an influence system! Claimed districts gain influence over time based on your gang's assigned arsenal. Higher influence unlocks district levels with better crime, PvP, and income bonuses. Assign arsenal items to specific turfs from the Arsenal tab to boost influence gain.",
    date: "2026-05-10",
    author: "Dev Team",
  },
];
