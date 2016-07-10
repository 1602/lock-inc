const redisDriver = require('./redis');

module.exports = function driverFactory(type, conf, settings) {
    switch(type) {
        case 'redis':
            return redisDriver(conf, settings);
        default:
            throw new Error('Driver not supported');
    }
};
