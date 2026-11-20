import { DEFAULT_RADIOS } from '../data/defaultRadios';
import { MAX_RADIOS, type CreateRadioInput, type RadioStation, type UpdateRadioInput } from '../types/radio';

const LOCAL_STORAGE_KEY = 'sintoniza_radios_5_v2';

export function validateStreamUrl(rawUrl: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'Informe a URL do streaming.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'A URL do streaming deve iniciar com http:// ou https://.',
      };
    }
    if (!parsed.hostname) {
      return { valid: false, normalized: trimmed, error: 'URL do streaming inválida.' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: trimmed, error: 'Formato de URL inválido.' };
  }
}

export function isExternalPlaylistUrl(rawUrl: string): boolean {
  const lower = rawUrl.trim().toLowerCase().split('?')[0];
  return lower.endsWith('.m3u') || lower.endsWith('.pls') || lower.endsWith('.xspf');
}

export function isHtmlReferencePageUrl(rawUrl: string): boolean {
  const lower = rawUrl.trim().toLowerCase();
  return lower.includes('radios.com.br/aovivo/') || lower.endsWith('.html') || lower.endsWith('.htm');
}

function normalizeStations(stations: RadioStation[]): RadioStation[] {
  return stations
    .slice(0, MAX_RADIOS)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((station, index) => ({
      id: station.id,
      name: station.name,
      city: station.city,
      stream_url: station.stream_url,
      position: index,
      source_playlist_url: station.source_playlist_url,
    }));
}

function writeLocalRadios(radios: RadioStation[]): RadioStation[] {
  const normalized = normalizeStations(radios);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function readLocalRadios(): RadioStation[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw === null) {
      // Primeiro acesso: inicializar automaticamente com as 5 rádios cadastradas.
      return writeLocalRadios(DEFAULT_RADIOS);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return writeLocalRadios(DEFAULT_RADIOS);
    }

    const validItems = parsed
      .filter(
        (item): item is RadioStation =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as RadioStation).id === 'string' &&
          typeof (item as RadioStation).name === 'string' &&
          typeof (item as RadioStation).stream_url === 'string'
      )
      .map((item) =>
        item.id === 'station-5-98-rock-sp' && item.stream_url.trim() === ''
          ? DEFAULT_RADIOS[4]
          : item
      );

    return normalizeStations(validItems);
  } catch {
    return writeLocalRadios(DEFAULT_RADIOS);
  }
}

export const radioService = {
  list(): RadioStation[] {
    return readLocalRadios();
  },

  create(input: CreateRadioInput): RadioStation[] {
    const current = readLocalRadios();
    if (current.length >= MAX_RADIOS) {
      throw new Error(`Limite máximo de ${MAX_RADIOS} rádios atingido. Exclua uma rádio antes de adicionar outra.`);
    }

    const cleanName = input.name.trim();
    const urlCheck = validateStreamUrl(input.stream_url);
    if (!cleanName) {
      throw new Error('Informe o nome da rádio.');
    }
    if (!urlCheck.valid) {
      throw new Error(urlCheck.error ?? 'URL do streaming inválida.');
    }

    const nextStation: RadioStation = {
      id: crypto.randomUUID(),
      name: cleanName,
      city: input.city?.trim() || undefined,
      stream_url: urlCheck.normalized,
      position: current.length,
    };

    return writeLocalRadios([...current, nextStation]);
  },

  update(id: string, input: UpdateRadioInput): RadioStation[] {
    const current = readLocalRadios();
    const index = current.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Rádio não encontrada.');
    }

    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Informe o nome da rádio.');
    }

    const trimmedUrl = input.stream_url.trim();
    let normalizedUrl = '';
    if (trimmedUrl.length > 0) {
      const urlCheck = validateStreamUrl(trimmedUrl);
      if (!urlCheck.valid) {
        throw new Error(urlCheck.error ?? 'URL do streaming inválida.');
      }
      normalizedUrl = urlCheck.normalized;
    }

    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            name: cleanName,
            city: input.city !== undefined ? input.city.trim() || undefined : item.city,
            stream_url: normalizedUrl,
          }
        : item
    );

    return writeLocalRadios(next);
  },

  remove(id: string): RadioStation[] {
    const filtered = readLocalRadios().filter((item) => item.id !== id);
    return writeLocalRadios(filtered);
  },

  reorder(orderedStations: RadioStation[]): RadioStation[] {
    return writeLocalRadios(orderedStations);
  },

  restoreDefaults(): RadioStation[] {
    return writeLocalRadios(DEFAULT_RADIOS);
  },

  exportToJsonFile(radios: RadioStation[]): void {
    const payload = normalizeStations(radios).map((station) => ({
      id: station.id,
      name: station.name,
      ...(station.city ? { city: station.city } : {}),
      stream_url: station.stream_url,
      position: station.position,
    }));

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'radios.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  },
};
