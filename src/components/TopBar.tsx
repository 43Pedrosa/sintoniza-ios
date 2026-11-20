import { Download, Radio } from 'lucide-react';
import { MAX_RADIOS } from '../types/radio';

interface TopBarProps {
  stationCount: number;
  onExportList: () => void;
}

export function TopBar({ stationCount, onExportList }: TopBarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
        >
          <Radio className="h-5 w-5 text-zinc-900" aria-hidden="true" />
          <span>Rádio Ford</span>
        </a>

        <div className="hidden sm:flex items-center gap-4 text-sm text-zinc-500">
          <span className="whitespace-nowrap shrink-0">Armazenamento local JSON</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-xs tabular-nums text-zinc-700 whitespace-nowrap shrink-0">
            {stationCount}/{MAX_RADIOS} estações
          </span>
        </div>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportList}
            disabled={stationCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>EXPORTAR LISTA</span>
          </button>
        </div>
      </div>
    </header>
  );
}
