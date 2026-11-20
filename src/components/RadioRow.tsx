import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GripVertical,
  Loader2,
  Pencil,
  Play,
  Square,
  Trash2,
} from 'lucide-react';
import { validateStreamUrl } from '../services/radioService';
import type {
  AudioPreviewState,
  RadioStation,
  StationDiagnosticResult,
  UpdateRadioInput,
} from '../types/radio';

interface RadioRowProps {
  station: RadioStation;
  index: number;
  totalCount: number;
  previewState: AudioPreviewState;
  diagnostic?: StationDiagnosticResult;
  onTogglePlay: (station: RadioStation) => void;
  onUpdate: (id: string, input: UpdateRadioInput) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

export function RadioRow({
  station,
  index,
  totalCount,
  previewState,
  diagnostic,
  onTogglePlay,
  onUpdate,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: RadioRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editName, setEditName] = useState(station.name);
  const [editCity, setEditCity] = useState(station.city ?? '');
  const [editUrl, setEditUrl] = useState(station.stream_url);
  const [editError, setEditError] = useState<string | null>(null);

  const isCurrentPreview = previewState.stationId === station.id;
  const isPlaying = isCurrentPreview && previewState.status === 'playing';
  const isLoadingAudio = isCurrentPreview && previewState.status === 'loading';
  const hasStreamUrl = station.stream_url.trim().length > 0;
  const previewError = isCurrentPreview && previewState.status === 'error' ? previewState.errorMessage : null;

  const handleStartEdit = () => {
    setEditName(station.name);
    setEditCity(station.city ?? '');
    setEditUrl(station.stream_url);
    setEditError(null);
    setConfirmingDelete(false);
    setIsEditing(true);
  };

  const handleSaveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);

    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError('Informe o nome da rádio.');
      return;
    }

    const trimmedUrl = editUrl.trim();
    if (trimmedUrl.length > 0) {
      const urlCheck = validateStreamUrl(trimmedUrl);
      if (!urlCheck.valid) {
        setEditError(urlCheck.error ?? 'URL do streaming inválida.');
        return;
      }
      onUpdate(station.id, {
        name: cleanName,
        city: editCity.trim(),
        stream_url: urlCheck.normalized,
      });
    } else {
      onUpdate(station.id, {
        name: cleanName,
        city: editCity.trim(),
        stream_url: '',
      });
    }

    setIsEditing(false);
  };

  return (
    <li
      draggable={!isEditing}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      className="border-b border-zinc-200 px-5 py-4 last:border-b-0 transition-colors hover:bg-zinc-50/70"
    >
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label htmlFor={`edit-name-${station.id}`} className="mb-1 block text-xs font-medium text-zinc-600">
                Nome da rádio
              </label>
              <input
                id={`edit-name-${station.id}`}
                type="text"
                required
                maxLength={120}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor={`edit-city-${station.id}`} className="mb-1 block text-xs font-medium text-zinc-600">
                Cidade (opcional)
              </label>
              <input
                id={`edit-city-${station.id}`}
                type="text"
                maxLength={80}
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Ex.: São Paulo - SP"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div className="md:col-span-5">
              <label htmlFor={`edit-url-${station.id}`} className="mb-1 block text-xs font-medium text-zinc-600">
                URL do streaming direto
              </label>
              <input
                id={`edit-url-${station.id}`}
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://servidor/stream.aac"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {editError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {editError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-1 shrink-0">
                <span
                  title="Arraste para reordenar"
                  className="hidden cursor-grab text-zinc-400 hover:text-zinc-700 sm:inline-flex"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <span className="w-6 font-mono text-xs font-medium tabular-nums text-zinc-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{station.name}</h3>
                  {station.city && (
                    <>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span className="text-xs text-zinc-500">{station.city}</span>
                    </>
                  )}
                  {isPlaying && (
                    <>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">Reproduzindo ao vivo</span>
                    </>
                  )}
                </div>

                {hasStreamUrl ? (
                  <p className="mt-0.5 truncate font-mono text-xs text-zinc-500" title={station.stream_url}>
                    {station.stream_url}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-amber-800">
                    Aguardando endereço de streaming confirmado — clique em Editar para informar a URL.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={() => onMove(station.id, 'up')}
                  disabled={index === 0}
                  aria-label={`Mover ${station.name} para cima`}
                  className="p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <span className="h-4 w-px bg-zinc-200" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => onMove(station.id, 'down')}
                  disabled={index === totalCount - 1}
                  aria-label={`Mover ${station.name} para baixo`}
                  className="p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onTogglePlay(station)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 whitespace-nowrap ${
                  isPlaying
                    ? 'border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800'
                    : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {isLoadingAudio ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Testando</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 whitespace-nowrap"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Editar</span>
              </button>

              {confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDelete(station.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>

          {previewError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
              <span>
                <strong className="font-semibold">
                  {diagnostic?.label ? `${diagnostic.label}: ` : ''}
                </strong>
                {previewError}
              </span>
            </div>
          ) : diagnostic ? (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                diagnostic.category === 'working'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {diagnostic.category === 'working' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
              )}
              <span>
                <strong className="font-semibold">{diagnostic.label}</strong>
                <span aria-hidden="true"> · </span>
                <span>{diagnostic.detail}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums text-zinc-600">{diagnostic.checkedAt}</span>
              </span>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}
