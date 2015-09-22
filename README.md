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
    .createClient({
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
            
        client
            .writeOne({
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

client
    .writeOne({
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

### `influent.createClient(config: Object)` -> `Promise[influent.DecoratorClient[influent.HttpClient]]`

Default factory for creating client. Creates `influent.DecoratorClient` instance, with `influent.HttpClient` inside.
This method calls `.check()` method of client, to make sure that connection is OK.

The `config` should have structure like:

```js
{
    server: {
        protocol: string
        host: string
        port: number
    }
    
    // or
    
    server: [ serverA... serverN ]
    
    username: string
    password: string
    database: string
    
    // optional:
    
    precision: enum[n, u, ms, s, m, h]
    epoch: enum[n, u, ms, s, m, h]
    max_batch: number
    chunk_size: number
    
    // client implementation additional options:
    
    ...
}

```

______________________

### Class: `influent.Client`

Abstract class of InfluxDB client. Has several abstract methods:

##### `new influent.Client([options: Object])`
##### `client.ping()` -> `Promise[Object{ info: influent.Info, host: influent.Host }]`

Pings given InfluxDB hosts. Returns promise that - if any host return successful status - resolved with first on to respond host and `Info` about that host.

##### `client.query(query: string[, options: Object])` -> `Promise[Object]`

Options could be an object with:

```js
{
    epoch: enum[n, u, ms, s, m, h]
    chunk_size: number
}

```

##### `client.writeOne(measurement: influent.Measurement[, options: Object])` -> `Promise[]`

Options could be an object with:

```js
{
    precision: enum[n, u, ms, s, m, h]
    max_batch: number
}

```

##### `client.writeMany(measurements: Array[influent.Measurement][, options: Object])` -> `Promise[]`

Options the same as in `writeOne`.

______________________

### Class: `influent.HttpClient`

Implementation of `influent.Client` for http usage. In addition to abstract methods has methods below.

##### `new influent.HttpClient(options: Object)`

Where additional to `influent.Client` options are:

```js
{
    // in which period client should recheck availability of hosts
    // by default this set to 30 minutes
    health_check_duration: number (milliseconds)
}

```

##### `httpClient.injectHttp(http: hurl.Http)`

Injector of http service, that is implementation of abstract `hurl.Http` class. `hurl` is just npm dependency.

##### `httpClient.getHost()` -> `Promise[influent.Host]`

Returns current active host. First host that was pinged succesfully, becomes active. This choice is tale after `health_check_duration` period.

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

### Class: `influent.Serializer`

##### `new influent.Serializer()`
##### `serializer.serialize(measurement: influent.Measurement)` -> `Promise[String]`

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
