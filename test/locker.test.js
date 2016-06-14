'use strict';

const should = require('should');
const lockerFactory = require('../');

describe('locker', () => {

    context('redis', () => {

        const redisLocker = lockerFactory({
            driver: 'redis',
            config: {
                host: 'localhost',
                port: 6379,
                database: 1,
            },
            settings: {
                prefix: 'lock:'
            }
        });

        beforeEach(redisLocker.purge);

        it('should allow to configure redis as transport', () => {
            return redisLocker.lock('resource')
                .then(lock => {
                    should.exist(lock);
                    lock.resourceId.should.equal('resource');
                    lock.key.should.equal(lockerFactory.hash('resource'));
                });
        });

        it('should throw an error when trying to access locked resource', () => {
            let caughtError;
            return redisLocker.lock('hello')
                .then(() => redisLocker.lock('hello'))
                .catch(err => caughtError = err)
                .then(() => {
                    should.exist(caughtError);
                    caughtError.message.should.equal('Resource locked');
                    (caughtError instanceof lockerFactory.ResourceLockedError)
                        .should.be.true();
                });
        });

        it('should unlock lock', () => {
            let lock;
            return redisLocker.lock('key')
                .then(l => {
                    lock = l;
                    return redisLocker.isLocked('key');
                })
                .then(isLocked => {
                    isLocked.should.be.true();
                    return lock.unlock();
                })
                .then(() => redisLocker.isLocked('key'))
                .then(isLocked => {
                    isLocked.should.be.false();
                });
        });

        it('should expire lock', () => {
            return redisLocker.lock('key', {expire: 1})
                .then(() => {
                    return redisLocker.isLocked('key');
                })
                .then(isLocked => {
                    isLocked.should.be.true();
                    return promiseTimeout(1100);
                })
                .then(() => redisLocker.isLocked('key'))
                .then(isLocked => {
                    isLocked.should.be.false();
                });
        });

        it('should allow purging locks', () => {
            return Promise.all(Array(1000).fill(0).map((x, i) => redisLocker.lock(String(i))))
                .then(() => redisLocker.isLocked('1'))
                .then(isLocked => isLocked.should.be.true())
                .then(() => redisLocker.purge())
                .then(() => redisLocker.isLocked('1'))
                .then(isLocked => isLocked.should.be.false());
        });

    });

});

function promiseTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

