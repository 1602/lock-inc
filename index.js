'use strict';

const crypto = require('crypto');
const URL_HASH_TYPE = 'SHA256';
const URL_HASH_ENCODING = 'base64';

const driverFactory = require('./lib/drivers');

module.exports = function lockerFactory(spec) {

    const driver = driverFactory(spec.driver, spec.config, spec.settings);

    return {
        lock,
        isLocked,
        purge,
        ResourceLockedError
    };

    function lock(resourceId, options) {
        const key = lockerFactory.hash(resourceId);
        const lockedAt = Date.now();
        let locked = true;
        return driver.lock(key, options)
            .then(numberOfLocks => {
                if (numberOfLocks > 1) {
                    throw new ResourceLockedError(resourceId, numberOfLocks);
                }
                return {
                    resourceId,
                    key,
                    lockedAt,
                    unlock: () => {
                        if (!locked) {
                            throw new Error('Not locked');
                        }
                        return driver.unlock(key)
                            .then(() => {
                                locked = false;
                            });
                    },
                };
            });
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
