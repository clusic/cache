const pathToRegexp = require('path-to-regexp');
const Help = require('./help');
const toString = Object.prototype.toString;
module.exports = class CacheModule {
  constructor(namespace, ctx, redis) {
    this.namespace = namespace;
    this.ctx = ctx;
    this.redis = redis;
  }
  
  decode(data) {
    const { type, value } = data;
    switch (type) {
      case 'Object':
      case 'Array': return JSON.parse(value);
      case 'Date': return new Date(Number(value));
      case 'Number': return Number(value);
      case 'Boolean': return value === 'true';
      case 'String': return value;
      case 'RegExp': return new RegExp(value);
      case 'Undefined': return;
      case 'Null': return null;
      case 'Buffer':
        if (!(value instanceof Buffer)) return new Buffer(value);
        return value;
      case 'ArrayBuffer':
        if (!(value instanceof ArrayBuffer)) return new ArrayBuffer(value);
        return value;
    }
  }
  
  encode(data) {
    let value;
    if (data instanceof Buffer) {
      return {
        type: 'Buffer',
        value: data
      }
    }
    if (data instanceof ArrayBuffer) {
      return {
        type: 'ArrayBuffer',
        value: data
      }
    }
    
    const type = toString.call(data).replace('[object ', '').replace(']', '');
    switch (type) {
      case 'Object':
      case 'Array': value = JSON.stringify(data); break;
      case 'Date': value = data.getTime() + ''; break;
      case 'Number': value = data + ''; break;
      case 'Boolean': value = data ? 'true' : 'false'; break;
      case 'String': value = data; break;
      case 'RegExp': value = data.toString(); break;
      case 'Undefined': value = 'undefined'; break;
      case 'Null': value = 'null'; break;
    }
    
    if (!type || !value) {
      throw new Error('转换数据结构过程出错：未知类型的数据');
    }
    
    return {
      type, value
    }
  }
  
  path(name, args = {}) {
    return this.namespace + pathToRegexp.compile(/^\//.test(name) ? name : '/' + name)(args).replace(/\//g, ':');
  }
  
  async load(name, args) {
    if (Array.isArray(args)) return await Promise.all(args.map(field => this.load(name, field)));
    const road = this.path(name, args);
    const exists = await this.redis.exists(road);
    if (exists) return this.decode(await this.redis.hgetall(road));
    return await this.build(name, args);
  }
  
  async build(name, args, expire) {
    if (Array.isArray(args)) return await Promise.all(args.map(field => this.build(name, field)));
    const road = this.path(name, args);
    const data = Help.getDataByRule(this, name);
    if (!data) throw new Error('更新缓存过程出错：找不到需要更新缓存的函数定义');
    const dataResult = await this[data.property](args);
    await this.redis.hmset(road, this.encode(dataResult));
    if (expire || data.expire) await this.redis.expire(road, expire || data.expire);
    return dataResult;
  }
  
  async expire(name, args, time) {
    await this.redis.expire(this.path(name, args), time);
  }
  
  async delete(name, args) {
    if (Array.isArray(args)) return await Promise.all(args.map(field => this.delete(name, field)));
    const road = this.path(name, args);
    const exists = await this.redis.exists(road);
    if (exists) await this.redis.del(road);
  }
  
  async set(name, args, data) {
    if (Array.isArray(args)) await Promise.all(args.map(field => this.set(name, field)));
    const road = this.path(name, args);
    await this.redis.hmset(road, this.encode(data));
  }
  
  async get(name, args) {
    if (Array.isArray(args)) return await Promise.all(args.map(field => this.get(name, field)));
    return this.decode(await this.redis.hgetall(this.path(name, args)));
  }
};