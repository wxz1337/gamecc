import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  mobileHeader: ReactNode;
  rightRail: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, mobileHeader, rightRail, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar" aria-label="主导航">
        {sidebar}
      </aside>
      <main className="app-shell__main">
        <div className="app-shell__mobile-header">{mobileHeader}</div>
        {children}
      </main>
      <aside className="app-shell__right-rail" aria-label="赛事辅助信息">
        {rightRail}
      </aside>
    </div>
  );
}
