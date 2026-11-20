import { useAudioPreview } from '../hooks/useAudioPreview';
import { useRadios } from '../hooks/useRadios';
import { RadioForm } from '../components/RadioForm';
import { RadioList } from '../components/RadioList';
import { TopBar } from '../components/TopBar';
import type { UpdateRadioInput } from '../types/radio';
import { MobileRadioPlayer } from '../components/MobileRadioPlayer';

export function AdminPage() {
  const {
    radios,
    isLimitReached,
    error,
    addRadio,
    updateRadio,
    deleteRadio,
    moveRadio,
    reorderRadios,
    restoreDefaultList,
    exportList,
  } = useRadios();

  const {
    previewState,
    diagnostics,
    isVerifyingAll,
    togglePreview,
    stopPreview,
    nextStation,
    previousStation,
    verifyAllStations,
    clearDiagnostic,
  } = useAudioPreview(radios);

  const handleUpdate = (id: string, input: UpdateRadioInput) => {
    if (previewState.stationId === id) {
      stopPreview();
    }
    clearDiagnostic(id);
    updateRadio(id, input);
  };

  const handleDelete = (id: string) => {
    if (previewState.stationId === id) {
      stopPreview();
    }
    clearDiagnostic(id);
    deleteRadio(id);
  };

  const handleRestoreDefaults = () => {
    stopPreview();
    radios.forEach((r) => clearDiagnostic(r.id));
    restoreDefaultList();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mobile-player-shell">
        <MobileRadioPlayer radios={radios} previewState={previewState} onPlay={togglePreview} onNext={nextStation} onPrevious={previousStation} />
      </div>
      <div className="desktop-admin-shell">
      <TopBar stationCount={radios.length} onExportList={exportList} />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            5 Estações de Rádio
          </h1>
          <p className="text-sm text-zinc-600">
            As estações iniciais já vêm pré-carregadas na ordem correta. Teste cada streaming, edite ou substitua endereços quando necessário e exporte{' '}
            <code className="font-mono text-xs text-zinc-900">radios.json</code> para o iPhone.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <RadioForm
          stationCount={radios.length}
          isLimitReached={isLimitReached}
          onAdd={addRadio}
        />

        <RadioList
          radios={radios}
          previewState={previewState}
          diagnostics={diagnostics}
          isVerifyingAll={isVerifyingAll}
          onTogglePlay={togglePreview}
          onStopPreview={stopPreview}
          onVerifyAll={() => void verifyAllStations(radios)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onMove={moveRadio}
          onReorder={reorderRadios}
          onRestoreDefaults={handleRestoreDefaults}
          onExportList={exportList}
        />
      </main>
      </div>
    </div>
  );
}
