import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { validateStreamUrl } from '../services/radioService';
import { MAX_RADIOS, type CreateRadioInput } from '../types/radio';

interface RadioFormProps {
  stationCount: number;
  isLimitReached: boolean;
  onAdd: (input: CreateRadioInput) => void;
}

export function RadioForm({ stationCount, isLimitReached, onAdd }: RadioFormProps) {
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (isLimitReached) {
      setValidationError(`Limite máximo de ${MAX_RADIOS} rádios atingido.`);
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setValidationError('Informe o nome da rádio.');
      return;
    }

    const urlCheck = validateStreamUrl(streamUrl);
    if (!urlCheck.valid) {
      setValidationError(urlCheck.error ?? 'URL do streaming inválida.');
      return;
    }

    try {
      onAdd({
        name: cleanName,
        stream_url: urlCheck.normalized,
      });
      setName('');
      setStreamUrl('');
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Erro ao adicionar rádio.');
    }
  };

  return (
    <section aria-labelledby="form-heading" className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="form-heading" className="text-base font-semibold text-zinc-950">
            Cadastrar estação
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Cadastre até {MAX_RADIOS} estações de rádio e teste o áudio antes de exportar para o iPhone.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-zinc-500">
          {stationCount} de {MAX_RADIOS} vagas ocupadas
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
        <div className="space-y-1.5 md:col-span-4">
          <label htmlFor="radio-name" className="block text-sm font-medium text-zinc-800">
            Nome da rádio
          </label>
          <input
            id="radio-name"
            type="text"
            required
            disabled={isLimitReached}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Rádio Cidade FM"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          />
        </div>

        <div className="space-y-1.5 md:col-span-5">
          <label htmlFor="radio-url" className="block text-sm font-medium text-zinc-800">
            URL do streaming
          </label>
          <input
            id="radio-url"
            type="url"
            required
            disabled={isLimitReached}
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://stream.exemplo.com/radio.mp3"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          />
        </div>

        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={isLimitReached}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Adicionar</span>
          </button>
        </div>
      </form>

      {isLimitReached && (
        <p role="status" className="mt-3 text-sm font-medium text-amber-800">
          Limite máximo de {MAX_RADIOS} rádios atingido. Exclua ou edite uma estação existente para cadastrar outra.
        </p>
      )}

      {validationError && !isLimitReached && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {validationError}
        </p>
      )}
    </section>
  );
}
