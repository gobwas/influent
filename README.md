#  [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

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
        ],
        
        // optional
        
        precision: "ms",
        epoch: "ms"
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
                    tag: "sweet"
                },
                fields: {
                    value: 10
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

+ `float64` values must contain a decimal. 1.0 is a float, 1 is an integer;
+ `int64` values may not contain a decimal. 1 is an integer, 1.0 is a float;
+ `boolean` values are t, T, true, True, or TRUE for TRUE, and f, F, false, False, or FALSE for FALSE;
+ `string` values for field values must be double-quoted. Double-quotes contained within the string must be escaped. All other characters are supported without escaping.

There is a little bit problem with Javascript numbers, cause it could be both integer or float. So for solve it here `influent.Value` abstraction for you:

```js
var influent = require("influent");

client
    .writeOne({
        key: "myseries",
        tags: {
            tag: "sweet"
        },
        fields: {
            // this will be saved as 10.0 into InfluxDB
            value: new Value(10, influent.type.FLOAT64) 
        },
        timestamp: Date.now()
    });
```


## API

### influent.createClient(config: Object) -> Promise[influent.DecoratorClient[influent.HttpClient]]

Where `config` should have structure like:

```
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
}

```

Default factory for creating client. Creates `influent.DecoratorClient` instance, with `influent.HttpClient` inside.
This method calls `.check()` method of client, to make sure that connection is OK.

______________________

### Class: influent.Client

Abstract class of InfluxDB client. Have several abstract methods:

##### new influent.Client([options: Object])
##### client.check() -> Promise[Object]

Checks availability for use given database.

##### client.query(query: string[, options: Object]) -> Promise[Object]

Options could be an object with:

```
{
    epoch: enum[n, u, ms, s, m, h]
}

```

##### client.writeOne(measurement: influent.Measurement[, options: Object]) -> Promise[]

Options could be an object with:

```
{
    precision: enum[n, u, ms, s, m, h]
}

```

##### client.writeMany(measurements: Array[influent.Measurement][, options: Object]) -> Promise[]

Options the same as in `writeOne`.

______________________

### Class: influent.HttpClient

Implementation of `influent.Client` for http usage. In addition to abstract methods has methods below.

##### httpClient.injectHttp(http: hurl.Http)

Injector of http service, that is implementation of abstract `hurl.Http` class. `hurl` is just npm dependency.

______________________

### Class: influent.DecoratorClient[T: influent.Client]

Implementation of `influent.Client` for client usability usage. Overloads abstract methods:

##### decoratorClient.writeOne(measurement: Object | influent.Measurement[, options: Object]) -> Promise[]

When measurement is `Object`, it should have structure like:

```
{
    key: string
    fields: {
        fieldName: string | number | boolean | influent.Value
    },
    tags: {
        tagName: string
    },
    timestamp: number
}
```

##### decoratorClient.writeMany(measurements: Array[ Object | influent.Measurement][, options: Object]) -> Promise[]

Where `Object` is the same as for `writeOne` above.

##### decoratorClient.injectClient(client: influent.Client)

______________________

### Class: influent.Serializer

##### new influent.Serializer()
##### serializer.serialize(measurement: influent.Measurement) -> Promise[String]

______________________

### Class: influent.LineSerializer

Line protocol implementation of `influent.Serializer`.

______________________

### Class: influent.Value

##### new influent.Value(data: string | number | boolean[, type: one of influx.type.TYPE)

______________________

### Class: influent.Measurement

##### new influent.Measurement(key: string)
##### measurement.addTag(key: string, value: string)
##### measurement.addField(key: string, value: influent.Value)
##### measurement.setTimestamp(timestamp: number)

______________________

### Class: influent.Host

##### new influent.Host(protocol: string, host: string, port: number)
##### host.toString() -> String

______________________

### influent.type

The type subpackage of influent.

##### type.TYPE 

Enum of types.

##### type.FLOAT64
##### type.INT64
##### type.BOOLEAN
##### type.STRING
##### type.getInfluxTypeOf(obj: *) -> one of type.TYPE

## Notes

<sup>[1](#browser)</sup>: Browser version is about 32KB minified, and 12KB gzipped.
**There are no polyfills in bundle for old browsers!**
Be sure, that you have at least this global objects and object methods:
+ Promise;
+ Object.keys;
+ Array.forEach;
+ XMLHttpRequest.

## License

MIT © [Sergey Kamardin](https://github.com)


[npm-image]: https://badge.fury.io/js/influent.svg
[npm-url]: https://npmjs.org/package/influent
[travis-image]: https://travis-ci.org/gobwas/influent.svg?branch=master
[travis-url]: https://travis-ci.org/gobwas/influent
[daviddm-image]: https://david-dm.org/gobwas/influent.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/gobwas/influent
