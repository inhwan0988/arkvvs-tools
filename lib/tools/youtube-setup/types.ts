export type GenerateResult = {
  titles: {
    text: string;
    principles: string[];
    reason: string;
  }[];
  thumbnails: {
    text: string;
    concept: string;
    principles: string[];
    beforeAfter: { before: string; after: string } | null;
    emotion: string;
  }[];
  description: string;
  keywords: {
    upper: string[];
    lower: string[];
    tags: string[];
  };
  checklist: { item: string; pass: boolean; comment: string }[];
};
