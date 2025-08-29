export interface Note {
  id: string;
  title: string;
  content: string;
  emoji: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListItem {
  type: "text" | "bullet" | "numbered";
  content: string;
  indent: number;
}
