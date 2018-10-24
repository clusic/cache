const path = require('path');
const is = require('is-type-of');
const FileLoader = require('@clusic/rex-loader/lib/file-loader');
const CacheLoader = Symbol('CacheLoader');

module.exports = async (app, plugin) => {
  const config = plugin.config;
  if (!config) throw new Error('@clusic/cache need config');
  app.Cache = {};
  app.addBabelRule(/app\/cache\//);
  Object.defineProperty(app.context, 'Cache', {
    get() {
      if (this[CacheLoader]) return this[CacheLoader];
      this[CacheLoader] = {};
      createContext(this, app.Cache, this[CacheLoader], config);
      return this[CacheLoader];
    }
  });
  app.Loader.addCompiler(async component => {
    const file = new FileLoader();
    const items = await file.match('**/*.js').parse(path.resolve(component, 'app', 'cache'));
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const properties = item.properties;
      const cacheExports = item.exports;
      properties.reduce((target, property, index) => {
        const _properties = properties.slice(0, index + 1).join('.');
        if (index === properties.length - 1) {
          if (property in target) throw new Error(`can't overwrite property '${_properties}'`);
          target[property] = cacheExports;
        } else if (!target[property]) {
          target[property] = {};
        }
        return target[property];
      }, app.Cache);
    }
    return () => Object.freeze(app.Cache);
  });
};

function createContext(ctx, service, target, config) {
  for (const i in service) {
    if (!is.function(service[i])) {
      target[i] = service[i];
      createContext(ctx, service[i], target[i], config);
    } else {
      const CacheModule = service[i];
      target[i] = function CacheTransformModule(redis) {
        return new CacheModule(config.namespace, ctx, redis)
      }
    }
  }
}