import { useCallback, useState } from 'react';
import { radioService } from '../services/radioService';
import { MAX_RADIOS, type CreateRadioInput, type RadioStation, type UpdateRadioInput } from '../types/radio';

export function useRadios() {
  const [radios, setRadios] = useState<RadioStation[]>(() => radioService.list());
  const [error, setError] = useState<string | null>(null);

  const isLimitReached = radios.length >= MAX_RADIOS;

  const addRadio = useCallback((input: CreateRadioInput) => {
    setError(null);
    try {
      const updated = radioService.create(input);
      setRadios(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar rádio.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateRadio = useCallback((id: string, input: UpdateRadioInput) => {
    setError(null);
    try {
      const updated = radioService.update(id, input);
      setRadios(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar rádio.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const deleteRadio = useCallback((id: string) => {
    setError(null);
    try {
      const updated = radioService.remove(id);
      setRadios(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir rádio.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const moveRadio = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const currentIndex = radios.findIndex((r) => r.id === id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= radios.length) return;

      const reordered = [...radios];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      setRadios(radioService.reorder(reordered));
    },
    [radios]
  );

  const reorderRadios = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= radios.length ||
        toIndex >= radios.length
      ) {
        return;
      }

      const reordered = [...radios];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      setRadios(radioService.reorder(reordered));
    },
    [radios]
  );

  const restoreDefaultList = useCallback(() => {
    setError(null);
    const restored = radioService.restoreDefaults();
    setRadios(restored);
  }, []);

  const exportList = useCallback(() => {
    setError(null);
    if (radios.length === 0) {
      setError('Cadastre pelo menos 1 rádio antes de exportar o arquivo radios.json.');
      return;
    }
    radioService.exportToJsonFile(radios);
  }, [radios]);

  return {
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
  };
}
