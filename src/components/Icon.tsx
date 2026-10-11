export type IconName =
  | "home"
  | "tasks"
  | "habits"
  | "calendar"
  | "focus"
  | "progress"
  | "review"
  | "settings"
  | "book"
  | "user"
  | "key"
  | "flag"
  | "feather"
  | "list"
  | "reload"
  | "pin"
  | "hide"
  | "check"
  | "plus"
  | "close"
  | "chevron-left"
  | "chevron-right"
  | "edit"
  | "trash"
  | "play"
  | "pause"
  | "skip"
  | "reset";

const PATHS: Record<IconName, readonly string[]> = {
  home: ["M3 11 12 3l9 8", "M5 9.5V21h14V9.5"],
  tasks: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "m8 12 3 3 5-6",
  ],
  habits: [
    "m17 2 4 4-4 4",
    "M3 11v-1a4 4 0 0 1 4-4h14",
    "m7 22-4-4 4-4",
    "M21 13v1a4 4 0 0 1-4 4H3",
  ],
  calendar: [
    "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    "M3 9h18",
    "M8 2v4",
    "M16 2v4",
  ],
  focus: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2", "M9 2h6"],
  progress: ["M3 21h18", "M7 21V11", "M12 21V4", "M17 21V14"],
  review: [
    "M8 6h13",
    "M8 12h13",
    "M8 18h13",
    "M3 6h.01",
    "M3 12h.01",
    "M3 18h.01",
  ],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  ],
  reload: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  book: [
    "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z",
    "M4 17.5A2.5 2.5 0 0 1 6.5 15H20",
  ],
  flag: [
    "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",
    "M4 22v-7",
  ],
  feather: [
    "M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z",
    "M16 8 2 22",
    "M17.5 15H9",
  ],
  list: [
    "M8 6h13",
    "M8 12h13",
    "M8 18h13",
    "M3 6h.01",
    "M3 12h.01",
    "M3 18h.01",
  ],
  user: [
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
    "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  ],
  key: [
    "M15 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    "M11 12H3",
    "M7 12v3",
    "M19 9l2-2-2-2",
  ],
  pin: [
    "M12 17v5",
    "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
  ],
  hide: [
    "M9.88 9.88a3 3 0 1 0 4.24 4.24",
    "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",
    "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",
    "m2 2 20 20",
  ],
  check: ["m5 12 5 5L20 7"],
  plus: ["M12 5v14", "M5 12h14"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"],
  trash: [
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M10 11v6",
    "M14 11v6",
  ],
  play: ["m6 4 14 8-14 8z"],
  pause: ["M8 5h3v14H8z", "M13 5h3v14h-3z"],
  skip: ["M5 4l10 8-10 8z", "M19 5v14"],
  reset: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
};

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
