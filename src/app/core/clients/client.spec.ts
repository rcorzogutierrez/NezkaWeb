import {
  clientLocation,
  emptyClient,
  fold,
  matchesSearch,
  normalizeClient,
  toClient,
} from './client';
import { testClient } from '../../../testing/clients-service.mock';

describe('client helpers', () => {
  it('formats the location like the desktop app', () => {
    expect(clientLocation({ city: 'Miami', state: 'FL', zipCode: '33142' })).toBe(
      'Miami, FL 33142',
    );
    expect(clientLocation({ city: '', state: 'FL', zipCode: '' })).toBe('FL');
  });

  it('searches every word, ignoring case and accents', () => {
    const c = testClient({ name: 'Café Habana', city: 'Doral', contactName: 'José Martí' });
    expect(matchesSearch(c, 'cafe doral')).toBe(true);
    expect(matchesSearch(c, 'JOSE')).toBe(true);
    expect(matchesSearch(c, 'cafe miami')).toBe(false);
    expect(matchesSearch(c, '  ')).toBe(true);
    expect(fold(' Ñandú ')).toBe('nandu');
  });

  it('trims text and lower-cases the email before saving', () => {
    const data = normalizeClient({ ...emptyClient(), name: '  Tree  ', email: ' A@B.COM ' });
    expect(data.name).toBe('Tree');
    expect(data.email).toBe('a@b.com');
  });

  it('reads documents with missing fields', () => {
    const c = toClient('x', { name: 'Solo nombre' });
    expect(c.city).toBe('');
    expect(c.active).toBe(true);
  });
});
