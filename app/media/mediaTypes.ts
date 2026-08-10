export type MediaFilter =
  | "All"
  | "Full games"
  | "Highlights"
  | "Interviews"
  | "Stories"
  | "Training"
  | "Other";

export type MediaLibraryItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  mediaType: string;
  filter: MediaFilter;
  platform: string;
  sourceKind: "Editorial" | "Game" | "Competition" | "Player" | "Team" | "Event";
  sourceLabel: string;
  sourceHref: string;
  competition: string;
  publishedAt: string;
  featured: boolean;
  rightsStatus: string;
};
