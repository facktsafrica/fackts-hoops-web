export type TeamPortalTutorial = {
  id: string;
  title: string;
  description: string;
  duration: string;
  url: string;
  featured?: boolean;
};

// This is the one shared tutorial catalogue for every club portal.
// Add future public YouTube tutorials here once; all teams receive them.
export const TEAM_PORTAL_TUTORIALS: TeamPortalTutorial[] = [
  {
    id: "complete-staff-walkthrough",
    title: "Coach and staff portal walkthrough",
    description:
      "The complete workflow for training, players, media, game statistics and Basketball IQ.",
    duration: "21 minutes",
    url: "https://youtu.be/UYH3sPM997c",
    featured: true,
  },
];
