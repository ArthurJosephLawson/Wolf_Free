import { greeting } from "./uiStore";

export function StandaloneNotice() {
  return (
    <div className="standalone-notice">
      <h1 style={{ marginBottom: 10 }}>Wolf needs its desktop shell</h1>
      <p>
        This page is the web frontend, but Wolf keeps its data in a local SQLite
        database reached through Tauri. Start the app with:
      </p>
      <p>
        <code>npm run dev</code>
      </p>
      <p className="faint">
        {greeting("")} — frontend-only mode cannot read or write your tasks,
        habits or events.
      </p>
    </div>
  );
}
