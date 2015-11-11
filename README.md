# :ocean: [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

> InfluxDB javascript driver


## Overview

This is a InfluxDB driver for Javascript apps. It could work both in Node or browser[<sup>1</sup>](#notes).

## Install

For node.js/iojs usage:

```sh
$ npm install --save influent
```

For usage in browser:

```sh
bower install --save influent
```


## Usage

```js
var influent = require('influent');

influent
    .createHttpClient({
        username: "gobwas",
        password: "xxxx",
        database: "mydb",
        server: [
            {
                protocol: "http",
                host:     "localhost",
                port:     8086
            }
        ]
    })
    .then(function(client) {
        client
            .query("show databases")
            .then(function(result) {
                // ...
            });

        // super simple point
        client.write({ key: "myseries", value: 10 });
            
        // more explicit point
        client
            .write({
                key: "myseries",
                tags: {
                    some_tag: "sweet"
                },
                fields: {
                    some_field: 10
                },
                timestamp: Date.now()
            })
            .then(function() {
                // ...
            });
    });
```

## Type System

According to InfluxDB@0.9 [docs](https://influxdb.com/docs/v0.9/write_protocols/write_syntax.html) there are four data types:

> Field values may be stored as float64, int64, boolean, or string. All subsequent field values must match the type of the first point written to given measurement.

+ `float64` values are the default numerical type. `1` is a float, `1i` is an integer;
+ `int64` value must have a trailing `i`. The field `bikes_present=15i` stores an integer and the field `bikes_present=15` stores a float;
+ `boolean` values are `t`, `T`, `true`, `True`, or `TRUE` for TRUE, and `f`, `F`, `false`, `False`, or `FALSE` for FALSE;
+ `string` values for field values must be double-quoted. Double-quotes contained within the string must be escaped. All other characters are supported without escaping.

There is a little bit problem with Javascript numbers, cause it could be both integer or float. So to solve it there is the `influent.Value` abstraction for you:

```js
var influent = require("influent");

// client creation somewhere

client
    .write({
        key: "myseries",
        tags: {
            some_tag: "sweet"
        },
        fields: {
            // this will be written as 10i, and saved as int64 10 into InfluxDB
            some_field: new influent.Value(10, influent.type.INT64),
            
            // another way to do the same thing, is to pass this value description
            another_field: {
                data: 10,
                type: influent.type.INT64
            }
        },
        timestamp: Date.now()
    });
```

## API

### `influent.createHttpClient(config: Object)` -> `Promise[influent.DecoratorClient[influent.HttpClient]]`

Creates `influent.DecoratorClient` instance, with `influent.HttpClient` inside.
This method makes `client.ping()`, to sure that connection is OK.

The `config` should have structure like:

```js
{
    server: {
        protocol: string
        host:     string
        port:     number
    }
    
    // or
    
    server: [ serverA... serverN ]
    
    username: string
    password: string
    database: string
    
    // optional:
    
    precision:  enum[n, u, ms, s, m, h]
    epoch:      enum[n, u, ms, s, m, h]
    max_batch:  number
    chunk_size: number
}

```

______________________

### `influent.createUdpClient(config: Object)` -> `Promise[influent.DecoratorClient[influent.UdpClient]]`

Default factory for creating udp client. Creates `influent.DecoratorClient` instance, with `influent.UdpClient` inside.

The `config` should have structure like:

```js
{
    server: {
        protocol: string
        host:     string
        port:     number
    }
    
    // or
    
    server: [ serverA... serverN ]
    
    // optional:
    
    max_batch:  number
    safe_limit: number
}

```

______________________

### Class: `influent.Client`

Abstract class of InfluxDB client. Has several abstract methods:

##### `new influent.Client([options: Object])`

##### `client.ping()` -> `Promise[Object{ info: influent.Info, host: influent.Host }]`

Pings host.

##### `client.query(query: string[, options: Object])` -> `Promise[Object]`

Asks for data.

##### `client.writeOne(measurements: Array[influent.Measurement][, options: Object])` -> `Promise[]`

Writes measurements.

______________________

### Class: `influent.NetClient`

Abstract ancessor of `influent.Client`. Has several injector methods:

##### `client.injectElector(elector: influent.Elector)`
##### `client.injectSerializer(serializer: influent.Serializer)`

______________________

### Class: `influent.HttpClient`

Implementation of `influent.NetClient` for http usage.

##### `new influent.HttpClient(options: Object)`

Where options could be like:

```js
{
    username:   string,
    password:   string,
    database:   string,
    
    max_batch:  number,
    chunk_size: number,
    precision:  enum[n, u, ms, s, m, h]
    epoch:      enum[n, u, ms, s, m, h]
}
```

##### `httpClient.query(query: string[, options: Object])` -> `Promise[Object]`

Options could be an object with:

```js
{
    epoch: enum[n, u, ms, s, m, h]
    chunk_size: number
}

```

##### `client.write(measurements: Array[influent.Measurement][, options: Object])` -> `Promise[]`

Options could be an object with:

```js
{
    precision: enum[n, u, ms, s, m, h]
    max_batch: number
}

```

##### `httpClient.injectHttp(http: hurl.Http)`

Injector of http service, that is implementation of abstract `hurl.Http` class. `hurl` is just npm dependency.

______________________

### Class: `influent.UdpClient`

Implementation of `influent.NetClient` for udp usage.

##### `new influent.HttpClient(options: Object)`

Where options could be like:

```js
{
    max_batch:  number
    safe_limit: number
}
```

##### `httpClient.query(query: string[, options: Object])` -> `Promise[Object]`

This method returns rejected `Promise`, cause there is no ability to fetch some data through udp from InfluxDB.

##### `client.write(measurements: Array[influent.Measurement][, options: Object])` -> `Promise[]`

Options could be an object with:

```js
{
    max_batch:  number
    safe_limit: number
}

```

##### `httpClient.injectUdp(http: influent.Udp)`

Injector of udp service.

______________________

### Class: `influent.DecoratorClient[T: influent.Client]`

Implementation of `influent.Client` for client usability usage. Overloads abstract methods:

##### `decoratorClient.writeOne(measurement: Object | influent.Measurement[, options: Object])` -> `Promise[]`

When measurement is `Object`, it should have structure like:

```js
{
    key: string
    fields: {
        fieldName: string | number | boolean | influent.Value
    },
    tags: {
        tagName: string
    },
    timestamp: number | string | Date
}
```

##### `decoratorClient.writeMany(measurements: Array[ Object | influent.Measurement][, options: Object])` -> `Promise[]`

Where `Object` is the same as for `writeOne` above.

##### `decoratorClient.injectClient(client: influent.Client)`

______________________

### Class: `influent.Elector`

Represents strategy of electing host to send request.

##### `new influent.Elector(hosts: Array[influent.Host][, options])`
##### `elector.getHost()` -> `Promise[Host]`

______________________

### Class: `influent.RoundRobinElector`

Round robin strategy of host election.

______________________

### Class: `influent.BaseElector`

Base strategy of election. Uses `influent.Ping` to check health.

##### `new influent.BaseElector(hosts: Array[influent.Host][, options])`

Where options:

```js
{
    period: number
}
```

##### `baseElector.injectPing(ping: influent.Ping)`

______________________

### Class: `influent.Ping`

Represents strategy of checking host health.

##### `new influent.Ping([, options])`
##### `ping.pong()` -> `Promise[]`

______________________

### Class: `influent.HttpPing`

Checks health via http request.

##### `new influent.HttpPing([, options])`

Where options:

```js
{
    timeout: number
}
```

##### `httpPing.injectHttp(http: hurl.Http)`

______________________

### Class: `influent.CmdPing`

Checks health via `exec ping ...`.

##### `new influent.CmdPing([, options])`

Where options:

```js
{
    timeout: number,
    count:   number
}
```

______________________

### Class: `influent.LineSerializer`

Line protocol implementation of `influent.Serializer`.

______________________

### Class: `influent.Value`

##### `new influent.Value(data: string | number | boolean[, type: one of influx.type.TYPE)`

______________________

### Class: `influent.Measurement`

##### `new influent.Measurement(key: string)`
##### `measurement.addTag(key: string, value: string)`
##### `measurement.addField(key: string, value: influent.Value)`
##### `measurement.setTimestamp(timestamp: string)`

Sets timestamp to the measurement. Using numeric `string`, [cause it make sense](https://github.com/gobwas/influent/pull/1#issuecomment-137720514) 
on a big numbers with precision in nanoseconds.

______________________

### Class: `influent.Host`

##### `new influent.Host(protocol: string, host: string, port: number)`
##### `host.toString()` -> `String`

______________________

### Class: `influent.Info`

Represents `client.ping()` meta information.

##### `new influent.Info()`

______________________

### `influent.type`

The type subpackage of influent.

##### `type.TYPE`

Enum of types.

##### `type.FLOAT64`
##### `type.INT64`
##### `type.BOOLEAN`
##### `type.STRING`
##### `type.getInfluxTypeOf(obj: *)` -> one of `type.TYPE`

## Notes

<sup>[1](#browser)</sup>: Browser version is about 32KB minified, and 12KB gzipped.
**There are no polyfills in bundle for old browsers!**
Be sure, that you have at least these global objects and object methods:
+ `Promise`;
+ `Object.keys`;
+ `Array.forEach`;
+ `XMLHttpRequest`.

Some Node.js specific classes are excluded from the `influent` API browser build.

## Compatibility

InfluxDB | Influent
---------|---------
`<0.9.3` | `^0.2.3`
`>0.9.3` | `^0.3.0`


## License

MIT © [Sergey Kamardin](https://github.com)


[npm-image]: https://badge.fury.io/js/influent.svg
[npm-url]: https://npmjs.org/package/influent
[travis-image]: https://travis-ci.org/gobwas/influent.svg?branch=master
[travis-url]: https://travis-ci.org/gobwas/influent
[daviddm-image]: https://david-dm.org/gobwas/influent.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/gobwas/influent
