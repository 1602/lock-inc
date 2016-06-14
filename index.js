'use strict';

const crypto = require('crypto');
const URL_HASH_TYPE = 'SHA256';
const URL_HASH_ENCODING = 'base64';
const DEFAULT_RETRY_INTERVAL = 200;
const DEFAULT_RETRY_ATTEMPTS = 20;

const driverFactory = require('./lib/drivers');

module.exports = function lockerFactory(spec) {

    const driver = driverFactory(spec.driver, spec.config, spec.settings);

    return {
        lock,
        isLocked,
        purge,
        ResourceLockedError,
        close: () => driver.close()
    };

    /**
     * Attempt to lock a resource.
     *
     * @param {String} resourceId - identifier of resource, could be any string
     * which represents resource.
     * @param {Object} options:
     *   - expire {Number}: number of seconds before lock expires, defaults to 60
     *   - retry {Boolean}: whether it is required to retry to obtain lock in case if
     *     it is locked, defaults to false
     *   - maxRetryAttempts {Number}: how many times to retry, defaults to 20
     *   - retryInterval {Number}: interval in milliseconds, defaults to 200
     */
    function lock(resourceId, options) {
        const key = lockerFactory.hash(resourceId);
        const retry = dget(options, 'retry', false);
        const retryInterval = dget(options, 'retryInterval', DEFAULT_RETRY_INTERVAL);
        let maxRetryAttempts = dget(options, 'maxRetryAttempts', DEFAULT_RETRY_ATTEMPTS);
        return driver.lock(key, options)
            .then(numberOfLocks => handleLockingResult(numberOfLocks));

        function handleLockingResult(numberOfLocks) {
            if (numberOfLocks === 1) {
                return buildLock(resourceId, key);
            }

            if (retry && --maxRetryAttempts >= 0) {
                return retryLockingAfterTimeout();
            }

            throw new ResourceLockedError(resourceId, numberOfLocks);
        }

        function retryLockingAfterTimeout() {
            return promiseTimeout(retryInterval)
                .then(() => driver.lock(key, options))
                .then(numberOfLocks => handleLockingResult(numberOfLocks));
        }

        function promiseTimeout(duration) {
            return new Promise(resolve => setTimeout(resolve), duration);
        }

        function dget(obj, key, def) {
            if (!obj || 'undefined' === typeof obj[key]) {
                return def;
            }
            const val = obj[key];
            delete obj[key];
            return val;
        }
    }

    function buildLock(resourceId, key) {
        let locked = true;

        return {
            resourceId,
            key,
            unlock,
        };

        function unlock() {
            if (!locked) {
                throw new Error('Not locked');
            }

            locked = false;
            return driver.unlock(key);
        }
    }


    function isLocked(resourceId) {
        return driver.isLocked(lockerFactory.hash(resourceId));
    }

    function purge() {
        return driver.purge();
    }

};

module.exports.hash = function(str) {
    if (!str) {
        throw new Error('Could not hash falsy value');
    }
    if ('string' !== typeof str) {
        throw new Error('Can not hash value which is not a string');
    }

    return crypto
        .createHash(URL_HASH_TYPE)
        .update(str)
        .digest()
        .toString(URL_HASH_ENCODING);
};

module.exports.ResourceLockedError = ResourceLockedError;

function ResourceLockedError(resourceId, numberOfLocks) {
    this.name = 'ResourceLockedError';
    this.message = 'Resource locked';
    this.details = {
        resourceId,
        numberOfLocks
    };

    Error.call(this, this.message);
    Error.captureStackTrace(this, ResourceLockedError);
}
