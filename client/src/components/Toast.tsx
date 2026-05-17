import { useEffect } from 'react';

export interface ToastEntry {
  id: string;
  text: string;
  kind: 'level' | 'combat' | 'curse' | 'death' | 'info';
}

const KIND_CLASSES: Record<ToastEntry['kind'], string> = {
  level: 'bg-amber-500/95 text-slate-950',
  combat: 'bg-red-600/95 text-white',
  curse: 'bg-purple-600/95 text-white',
  death: 'bg-black border-2 border-red-500 text-red-300',
  info: 'bg-slate-700/95 text-white',
};

const KIND_ICONS: Record<ToastEntry['kind'], string> = {
  level: '⬆️',
  combat: '⚔️',
  curse: '💀',
  death: '☠️',
  info: 'ℹ️',
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastEntry[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-16 inset-x-0 z-40 flex flex-col items-center gap-2 px-3 pointer-events-none">
      {toasts.map((tt) => (
        <Toast key={tt.id} entry={tt} onDismiss={() => onDismiss(tt.id)} />
      ))}
    </div>
  );
}

function Toast({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, entry.kind === 'death' ? 4500 : 3000);
    return () => clearTimeout(id);
  }, [entry.id, onDismiss, entry.kind]);

  return (
    <div
      role="status"
      className={[
        'anim-slide-in rounded-xl px-4 py-2 shadow-xl max-w-sm w-full text-center font-bold pointer-events-auto',
        KIND_CLASSES[entry.kind],
      ].join(' ')}
    >
      <span className="mr-1.5" aria-hidden="true">{KIND_ICONS[entry.kind]}</span>
      {entry.text}
    </div>
  );
}
