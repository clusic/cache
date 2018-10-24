exports.Expression = function(rule) {
  return (target, property) => {
    const object = makeRule(target, property);
    object.rule = rule;
  }
};

exports.Expire = function(expire) {
  return (target, property) => {
    const object = makeRule(target, property);
    object.expire = expire;
  }
};

exports.getDataByRule = function(target, rule) {
  if (target.rules) {
    for (const i in target.rules) {
      if (target.rules[i].rule === rule) {
        return target.rules[i];
      }
    }
  }
};

function makeRule(target, property) {
  if (!target.rules) target.rules = {};
  if (!target.rules[property]) target.rules[property] = {
    rule: null,
    expire: 0
  };
  return target.rules[property];
}