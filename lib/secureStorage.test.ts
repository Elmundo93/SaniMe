import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_KEYS, schluesselbundNachNeuinstallationLeeren } from './secureStorage';

jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn(() => Promise.resolve()) }));

const mockSpeicher = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockSpeicher.get(k) ?? null)),
  setItem: jest.fn((k: string, v: string) => Promise.resolve(void mockSpeicher.set(k, v))),
  getAllKeys: jest.fn(() => Promise.resolve([...mockSpeicher.keys()])),
}));

beforeEach(() => {
  mockSpeicher.clear();
  jest.clearAllMocks();
});

describe('schluesselbundNachNeuinstallationLeeren', () => {
  it('leert nach einer Neuinstallation den ganzen Schlüsselbund und merkt sich das', async () => {
    await schluesselbundNachNeuinstallationLeeren();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(SECURE_KEYS.length);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('sanime_installiert', '1');

    await schluesselbundNachNeuinstallationLeeren();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(SECURE_KEYS.length);
  });

  it('lässt eine bestehende Installation (Update) unangetastet', async () => {
    mockSpeicher.set('sanime_onboarding', 'true');
    await schluesselbundNachNeuinstallationLeeren();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockSpeicher.get('sanime_installiert')).toBe('1');
  });
});
