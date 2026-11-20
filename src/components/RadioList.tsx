import { useRef, useState } from 'react';
import { Activity, Download, Radio, RotateCcw, Square } from 'lucide-react';
import {
  MAX_RADIOS,
  type AudioPreviewState,
  type RadioStation,
  type StationDiagnosticResult,
  type UpdateRadioInput,
} from '../types/radio';
import { RadioRow } from './RadioRow';

interface RadioListProps {
  radios: RadioStation[];
  previewState: AudioPreviewState;
  diagnostics: Record<string, StationDiagnosticResult>;
  isVerifyingAll: boolean;
  onTogglePlay: (station: RadioStation) => void;
  onStopPreview: () => void;
  onVerifyAll: () => void;
  onUpdate: (id: string, input: UpdateRadioInput) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRestoreDefaults: () => void;
  onExportList: () => void;
}

export function RadioList({
  radios,
  previewState,
  diagnostics,
  isVerifyingAll,
  onTogglePlay,
  onStopPreview,
  onVerifyAll,
  onUpdate,
  onDelete,
  onMove,
  onReorder,
  onRestoreDefaults,
  onExportList,
}: RadioListProps) {
  const dragFromIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const [confirmingRestore, setConfirmingRestore] = useState(false);

  const handleDragStart = (index: number) => {
    dragFromIndexRef.current = index;
    dragOverIndexRef.current = index;
  };

  const handleDragOver = (index: number) => {
    dragOverIndexRef.current = index;
  };

  const handleDragEnd = () => {
    const from = dragFromIndexRef.current;
    const to = dragOverIndexRef.current;
    dragFromIndexRef.current = null;
    dragOverIndexRef.current = null;

    if (from !== null && to !== null && from !== to) {
      onReorder(from, to);
    }
  };

  return (
    <section aria-labelledby="list-heading" className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="flex items-baseline gap-3">
          <h2 id="list-heading" className="text-base font-semibold text-zinc-950">
            Rádios cadastradas
          </h2>
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {radios.length} / {MAX_RADIOS}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {radios.length > 0 && (
            <button
              type="button"
              onClick={isVerifyingAll ? onStopPreview : onVerifyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 whitespace-nowrap"
            >
              {isVerifyingAll ? (
                <>
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  <span>Parar verificação</span>
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Testar todas</span>
                </>
              )}
            </button>
          )}

          {confirmingRestore ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onRestoreDefaults();
                  setConfirmingRestore(false);
                }}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap"
              >
                Confirmar restauração
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRestore(false)}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRestore(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restaurar lista inicial</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportList}
            disabled={radios.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>EXPORTAR LISTA</span>
          </button>
        </div>
      </div>

      {radios.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Radio className="mb-3 h-7 w-7 text-zinc-300" aria-hidden="true" />
          <p className="text-sm font-medium text-zinc-900">Nenhuma rádio na lista</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Cadastre novas estações acima ou clique em Restaurar lista inicial para carregar as 5 rádios padrão.
          </p>
        </div>
      ) : (
        <ul>
          {radios.map((station, index) => (
            <RadioRow
              key={station.id}
              station={station}
              index={index}
              totalCount={radios.length}
              previewState={previewState}
              diagnostic={diagnostics[station.id]}
              onTogglePlay={onTogglePlay}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
