'use strict';

const redis = require('redis');
const assert = require('assert');

module.exports = function redisDriver(conf, spec) {

    const client = redis.createClient(conf);
    const prefix = spec.prefix;

    assert(prefix, 'Prefix required');

    return {
        lock,
        isLocked,
        purge
    };

    function lock(resourceId, options) {
        return new Promise((resolve, reject) => {
            const key = makeKey(resourceId);
            client.incr(key, (err, result) => {
                if (err) {
                    return reject(err);
                }
                if (Number(result) === 1) {
                    if (options && options.expire) {
                        client.expire(key, options.expire, () => {
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                    return;
                }
                reject(new Error('Resource locked'));
            });
        });
    }

    function isLocked(resourceId) {
        return new Promise((resolve, reject) => {
            client.exists(makeKey(resourceId), (err, exists) => {
                if (err) {
                    return reject(err);
                }
                resolve(Boolean(exists));
            });
        });
    }

    function makeKey(resourceId) {
        return `${prefix}${resourceId}`;
    }

    function purge() {
        return scan(prefix + '*', del);
    }

    function scan(pattern, fn, cursor) {
        return new Promise((resolve, reject) => {
            client.scan(cursor || 0, 'MATCH', pattern, function(err, res) {
                if (err) {
                    return reject(err);
                }
                if (res[1] && res[1].length === 0) {
                    return resolve();
                }
                fn(res[1])
                    .then(() => scan(pattern, fn, res[0]))
                    .then(resolve, reject);
            });
        });
    }

    function del(keys) {
        return new Promise((resolve, reject) => {
            client.del.apply(client, keys.concat(function(err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }));
        });
    }

};

