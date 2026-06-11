import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export default function WorkspaceLayout({
  leftPanel,
  centerPanel,
  rightPanel,
}: WorkspaceLayoutProps) {
  return (
    <div className="min-h-screen pt-16 bg-gradient-ink">
      <div
        className={cn(
          'h-[calc(100vh-4rem)] p-4 gap-4',
          'flex flex-col md:flex-row',
        )}
      >
        <aside
          className={cn(
            'glass-card overflow-hidden flex-shrink-0',
            'w-full md:w-72 xl:w-80',
            'h-64 md:h-full',
          )}
        >
          <div className="h-full overflow-y-auto">{leftPanel}</div>
        </aside>

        <main
          className={cn(
            'glass-card overflow-hidden flex-1 min-w-0',
            'h-64 md:h-full',
            'order-first md:order-none',
          )}
        >
          <div className="h-full overflow-hidden">{centerPanel}</div>
        </main>

        <aside
          className={cn(
            'glass-card overflow-hidden flex-shrink-0',
            'w-full md:w-72 xl:w-[340px]',
            'h-64 md:h-full',
          )}
        >
          <div className="h-full overflow-y-auto">{rightPanel}</div>
        </aside>
      </div>
    </div>
  );
}
