const AREDL_LEVELS_URLS = {
  classic: 'https://api.aredl.net/v2/api/aredl/levels',
  platformer: 'https://api.aredl.net/v2/api/arepl/levels'
};

const aredlCache = {
  classic: { expiresAt: 0, levels: [] },
  platformer: { expiresAt: 0, levels: [] }
};

export async function getAredlLevels(type) {
  if (!Object.hasOwn(AREDL_LEVELS_URLS, type)) throw new Error('Invalid AREDL list type');
  const cache = aredlCache[type];
  if (cache.expiresAt > Date.now()) return cache.levels;

  const response = await fetch(AREDL_LEVELS_URLS[type], {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`AREDL responded with ${response.status}`);

  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Unexpected AREDL response');
  const levels = payload
    .filter((level) => level.id && level.name && Number.isInteger(level.position) && ['MainList', 'Legacy'].includes(level.status))
    .map(({ id, name, position, status }) => ({ id, name, position, status }));

  aredlCache[type] = { expiresAt: Date.now() + 15 * 60 * 1000, levels };
  return levels;
}
