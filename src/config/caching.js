const caching = require("cache-manager").caching;

const memoryCache = caching("memory", {
  max: 1000,
    ttl: 60 * 60 * 24, // 24 hours
});

module.exports = {
  memoryCache,
  setCache: async (key, value, options = {}) => {
    const mCache = await memoryCache;

    await mCache.set(key, value, options);
  },
  getCache: async (key) => {
    const mCache = await memoryCache;
    return await mCache.get(key);
  },
  deleteCache: async (key) => {
    const mCache = await memoryCache;
    await mCache.del(key);
  },
  invalidateCache: async (key) => {},
};
