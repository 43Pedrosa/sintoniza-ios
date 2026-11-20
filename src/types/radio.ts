export const MAX_RADIOS = 5;

export interface RadioStation {
  id: string;
  name: string;
  city?: string;
  stream_url: string;
  position: number;
  source_playlist_url?: string;
}

export interface CreateRadioInput {
  name: string;
  city?: string;
  stream_url: string;
}

export interface UpdateRadioInput {
  name: string;
  city?: string;
  stream_url: string;
}

export type StreamDiagnosticCategory =
  | 'idle'
  | 'checking'
  | 'working'
  | 'unavailable'
  | 'invalid_url'
  | 'playlist_inaccessible'
  | 'incompatible_format';

export interface AudioPreviewState {
  stationId: string | null;
  status: 'idle' | 'loading' | 'playing' | 'error';
  category: StreamDiagnosticCategory;
  errorMessage: string | null;
}

export interface StationDiagnosticResult {
  category: StreamDiagnosticCategory;
  label: string;
  detail: string;
  checkedAt: string;
}
