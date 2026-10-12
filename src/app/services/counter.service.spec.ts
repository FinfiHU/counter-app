import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedCounter } from '../models/saved-counter';
import { CounterService } from './counter.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('CounterService', () => {
  let service: CounterService;

  const getMock = vi.mocked(Preferences.get);
  const setMock = vi.mocked(Preferences.set);
  const removeMock = vi.mocked(Preferences.remove);

  const first: SavedCounter = {
    id: 'first',
    name: 'První',
    value: 1,
    createdAt: '2026-09-17T08:00:00.000Z',
  };

  const second: SavedCounter = {
    id: 'second',
    name: 'Druhé',
    value: 2,
    createdAt: '2026-09-17T09:00:00.000Z',
  };

  beforeEach(() => {
    // Vynulujeme počty volání mocků z předchozího testu.
    vi.clearAllMocks();

    // Výchozí stav: v Preferences zatím není uložená historie.
    getMock.mockResolvedValue({ value: null });

    // Zápis i odstranění ve výchozím stavu úspěšně skončí.
    setMock.mockResolvedValue(undefined);
    removeMock.mockResolvedValue(undefined);

    // Pro každý test vytvoříme nové prostředí Angular dependency injection.
    TestBed.configureTestingModule({
      providers: [CounterService],
    });

    // Z testovacího injectoru získáme čerstvou instanci služby.
    service = TestBed.inject(CounterService);
  });

  it('should initialize only once', async () => {
    // Dvě volání bez čekání simulují souběžné požadavky na inicializaci.
    await Promise.all([service.initialize(), service.initialize()]);

    // Další volání proběhne až po dokončení první inicializace.
    await service.initialize();

    // Všechna volání musí sdílet jedinou operaci načtení Preferences.
    expect(getMock).toHaveBeenCalledTimes(1);

    // Služba dokončila inicializaci a při value: null má prázdnou historii.
    expect(service.initialized()).toBe(true);
    expect(service.counters()).toEqual([]);
  });

  it('should load saved counters from JSON during initialization', async () => {
    getMock.mockResolvedValue({ value: JSON.stringify([first, second]) });

    await service.initialize();

    expect(service.counters()).toEqual([first, second]);
  });

  it('should add a counter to the beginning and persist it', async () => {
    getMock.mockResolvedValue({ value: JSON.stringify([first]) });

    await service.add(second);

    expect(service.counters()).toEqual([second, first]);
    expect(setMock).toHaveBeenCalledWith({
      key: 'saved-counters',
      value: JSON.stringify([second, first]),
    });
  });

  it('should remove only the matching counter and persist the result', async () => {
    getMock.mockResolvedValue({ value: JSON.stringify([first, second]) });

    await service.remove(first.id);

    expect(service.counters()).toEqual([second]);
    expect(setMock).toHaveBeenCalledWith({
      key: 'saved-counters',
      value: JSON.stringify([second]),
    });
  });

  it('should clear the counters and remove the saved history key', async () => {
    getMock.mockResolvedValue({ value: JSON.stringify([first, second]) });

    await service.clear();

    expect(service.counters()).toEqual([]);
    expect(removeMock).toHaveBeenCalledExactlyOnceWith({
      key: 'saved-counters',
    });
    expect(setMock).not.toHaveBeenCalled();
  });

  it('should handle invalid saved JSON and log the error', async () => {
    getMock.mockResolvedValue({ value: '{invalid json' });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      await expect(service.initialize()).resolves.toBeUndefined();

      expect(service.counters()).toEqual([]);
      expect(service.initialized()).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Historii počítadel se nepodařilo načíst.',
        expect.any(SyntaxError),
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});