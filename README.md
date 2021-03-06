# Optimistic locking library

[![Coverage Status](https://coveralls.io/repos/github/1602/lock-inc/badge.svg?branch=master)](https://coveralls.io/github/1602/lock-inc?branch=master)

It uses redis `INCR` command to obtain lock of resource. Logic is dead simple - if
redis returns 1 - we got lock if it returns more than 2 it will throw
`Resource locked` error.

## Installation

    npm install lock-inc

## Usage

```
const lockFactory = require('lock-inc');
const locker = lockFactory({
    driver: 'redis',
    // for all possible config: object keys see https://github.com/NodeRedis/node_redis#options-is-an-object-with-the-following-possible-properties
    config: {
    	host: 'localhost',
	port: 6379,
	db: 1
    },
    settings: {
    	prefix: 'lock:'
    }
});

// simple locking
locker.lock('User:1602')
    .then(lock => {
    	return doSomethingAsync()
	    .then(lock.unlock);
    });

// unlock by timeout (uses redis EXPIRE command)
locker.lock('User:1603', {expire: 1}) // lock will expire in 1 second
    .then(lock => {
    	doJob();
    	lock.unlock(); // it is safe to not call it at all
    });

// to remove all existing locks
locker.purge()
    .then(() => console.log('All locks removed'));
```

## MIT License

    Copyright (C) 2011 by Anatoliy Chakkaev <mail [åt] anatoliy [døt] in>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
