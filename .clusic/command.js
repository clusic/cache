const path = require('path');
module.exports = async (addtion, cwd, cmd, configs, ...args) => {
  if (!configs.cache) return;
  let filePath = args.join('/');
  if (!/\.js$/.test(filePath)) filePath += '.js';
  await addtion.render(path.resolve(__dirname, 'cache.ejs'), path.resolve(cwd, 'app', 'cache', filePath), {
    className: addtion.prefix(...args) + 'Cache'
  });
};