import { Disc3, Pause, Play, Radio, SkipBack, SkipForward } from 'lucide-react';
import type { AudioPreviewState, RadioStation } from '../types/radio';

interface Props {
  radios: RadioStation[];
  previewState: AudioPreviewState;
  onPlay: (station: RadioStation) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function MobileRadioPlayer({ radios, previewState, onPlay, onNext, onPrevious }: Props) {
  const current = radios.find((station) => station.id === previewState.stationId) ?? null;
  const playing = previewState.status === 'playing';
  const loading = previewState.status === 'loading';

  return (
    <main className="mobile-radio-app">
      <header className="mobile-radio-header">
        <div className="mobile-brand"><Radio size={19} /><span>SINTONIZA</span></div>
        <span className="mobile-live-label"><span /> RÁDIO AO VIVO</span>
      </header>

      <section className="mobile-now-playing" aria-label="Player">
        <div className="mobile-album-art ford-emblem"><img src="/android-chrome-512x512.png" alt="Rádio Ford 1974" /></div>
        <div className="mobile-track-meta">
          <span className="eyebrow">{playing ? 'TRANSMITINDO AGORA' : loading ? 'CONECTANDO' : 'SINTONIZA • RÁDIO'}</span>
          <h1>{current?.name ?? 'Escolha uma rádio'}</h1>
          <p>{current?.city ?? 'Sua música, em qualquer lugar'}</p>
        </div>
        <div className="mobile-player-controls">
          <button className="glass-control secondary" aria-label="Rádio anterior" onClick={onPrevious} disabled={!radios.length}><SkipBack size={23} fill="currentColor"/></button>
          <button className="glass-control primary" aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={() => onPlay(current ?? radios[0])} disabled={!radios.length || loading}>
            {playing ? <Pause size={27} fill="currentColor"/> : <Play size={27} fill="currentColor"/>}
          </button>
          <button className="glass-control secondary" aria-label="Próxima rádio" onClick={onNext} disabled={!radios.length}><SkipForward size={23} fill="currentColor"/></button>
        </div>
        <div className="mobile-playing-status"><span className={playing ? 'equalizer active' : 'equalizer'}><i/><i/><i/><i/></span>{previewState.errorMessage ?? (playing ? 'Reprodução ao vivo' : 'Selecione uma estação para começar')}</div>
      </section>

      <section className="mobile-stations-section">
        <div className="mobile-section-heading"><div><span className="eyebrow">SUA SELEÇÃO</span><h2>Estações</h2></div><span>{radios.length.toString().padStart(2, '0')}</span></div>
        <div className="mobile-station-list">
          {radios.map((station, index) => {
            const selected = current?.id === station.id;
            return <button key={station.id} className={`mobile-station-row ${selected ? 'selected' : ''}`} onClick={() => onPlay(station)}>
              <span className="station-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="station-disc"><Disc3 size={21}/></span>
              <span className="station-copy"><strong>{station.name}</strong><small>{station.city || 'Brasil'}</small></span>
              <span className="station-action">{selected && playing ? <span className="equalizer active"><i/><i/><i/><i/></span> : <Play size={17}/>}</span>
            </button>;
          })}
          {!radios.length && <p className="mobile-empty">Nenhuma rádio cadastrada.</p>}
        </div>
      </section>
      <footer className="mobile-footer">SINTONIZA <span>•</span> RÁDIO EM TODO LUGAR</footer>
    </main>
  );
}
