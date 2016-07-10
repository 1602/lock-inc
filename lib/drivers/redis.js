'use strict';

const redis = require('redis');
const assert = require('assert');

module.exports = function redisDriver(conf, spec) {

    const client = redis.createClient(conf);
    const prefix = spec.prefix;

    assert(prefix, 'Prefix required');

    return {
        lock,
        unlock,
        isLocked,
        purge,
        close
    };

    function lock(resourceId, options) {
        options = options || {};
        options.expire = options.expire || 60;
        return new Promise((resolve, reject) => {
            const key = makeKey(resourceId);
            client.multi()
                .incr(key)
                .ttl(key)
                .exec((err, results) => {
                    const numberOfLocks = Number(results[0]);
                    const timeToLive = Number(results[1]);
                    if (err) {
                        return reject(err);
                    }
                    if (numberOfLocks === 1) {
                        client.expire(key, options.expire, () => {
                            resolve(numberOfLocks);
                        });
                        return;
                    }
                    if (timeToLive === -1) {
                        client.expire(key, options.expire, () => {
                            resolve(numberOfLocks);
                        });
                        return;
                    }
                    if (timeToLive === -2) {
                        reject(new Error('Unexpected TTL for key'));
                        return;
                    }
                    resolve(numberOfLocks);
                });
        });
    }

    function unlock(resourceId) {
        return del(makeKey(resourceId));
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
            client.del(keys, function(err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    function close() {
        client.quit();
    }

};

