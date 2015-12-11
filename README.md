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
        server: [
            {
                protocol: "http",
                host:     "localhost",
                port:     8086
            }
        ],
        username: "gobwas",
        password: "xxxx",
        
        database: "mydb"
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
            i_field: new influent.I64(10),
            
            // implicit way to write values
            // note that all implicit field numbers are casted to the influxdb's float64
            
            f_field: 10,       // is equal to new influent.F64(10)
            s_field: "string"  // is equal to new influent.Str("string")
            b_field: true      // is equal to new influent.Bool(true)
        },
        timestamp: Date.now()
    });
```

## Usage without decorator

When you call `influent.createAnyClient` you get a decorated client, that allows you to pass simple object 
literals to `write` and `query`. This, of course, get some performance overhead and unnecessary object casting and type checks.

You could use this way, to be more explicit:

```js
    // create client
    var client = new HttpClient({
        username: "gobwas",
        password: "xxxx"
    });
    
    // use line serializer
    client.injectSerializer(new LineSerializer());
    
    // use http client (this is for node, XhrHttp is for browser)
    client.injectHttp(new NodeHttp());
    
    // use stub elector, that always elects first host
    client.injectElector(new StubElector([ host ]));

    // create batch of points
    var batch = new Batch({ database: "mydb" });
    batch.add((new Measurement("key")).addField("value", 1))
    
    // send batch
    client.write(batch).then(...);
    
    // create query object
    var query = new Query("select * from key", { database: "mydb" });
    
    // eval query
    client.query(query).then(...);
    
```

## API

### `influent.createHttpClient(config: Object)` -> `Promise[influent.DecoratorClient[influent.HttpClient]]`

Creates `influent.DecoratorClient` instance, with `influent.HttpClient` inside.
This method makes `client.ping()`, to sure that connection is OK.

The `config` should have structure like this:

```js
{
    // required
    // --------
    
    server: {
        protocol: string
        host:     string
        port:     number
    }
    // or
    server: [ serverA... serverN ]
    
    username: string
    password: string
    
    // optional
    // --------
    
    database: string
    
    // write options
    precision:   enum[n, u, ms, s, m, h]
    consistency: enum[one, quorum, all, any]
    rp:          string
    max_batch:   number
    
    // query options
    epoch:      enum[n, u, ms, s, m, h]
    chunk_size: number
}
```

______________________

### `influent.createUdpClient(config: Object)` -> `Promise[influent.DecoratorClient[influent.UdpClient]]`

Default factory for creating udp client. Creates `influent.DecoratorClient` instance, with `influent.UdpClient` inside.

The `config` should have structure like:

```js
{
    // required
    // --------
    
    server: {
        protocol: string
        host:     string
        port:     number
    }
    // or
    server: [ serverA... serverN ]
    
    // optional
    // --------
    
    // write options
    precision:   enum[n, u, ms, s, m, h] // unsupported yet
    max_batch:   number
    safe_limit:  number   
}
```

______________________

### Class: `influent.Batch`

##### `new influent.Batch([options: Object])`

Where options could be:

```js
{
    database:    string
    precision:   enum[n, u, ms, s, m, h]
    consistency: enum[one, quorum, all, any]
    rp:          string
}
```

##### `batch.add(m: influent.Measurement)`
##### `batch.options()` -> `Object`
##### `batch.measurements()` -> `Array[Measurement]`
______________________

### Class: `influent.Query`

##### `new influent.Query(command: string[, options: Object])`

Where options could be:

```js
{
    database:   string
    epoch:      enum[n, u, ms, s, m, h]
    chunk_size: number
}
```

##### `query.command()` -> `string`
##### `query.options()` -> `Object`
______________________

### Class: `influent.Client`

Abstract class of InfluxDB client. Has several abstract methods:

##### `new influent.Client([options: Object])`

##### `client.ping()` -> `Promise[Object{ info: influent.Info, host: influent.Host }]`

Pings host.

##### `client.query(query: influent.Query)` -> `Promise[Object]`

Asks for data.

##### `client.write(batch: influent.Batch)` -> `Promise[]`

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
    // required
    // --------
    
    username:   string,
    password:   string,
}
```

##### `httpClient.query(query: influent.Query)` -> `Promise[Object]`
##### `httpClient.write(batch: influent.Batch)` -> `Promise[]`
##### `httpClient.injectHttp(http: hurl.Http)`

Injector of http service, that is implementation of abstract `hurl.Http` class. `hurl` is just npm dependency.

______________________

### Class: `influent.UdpClient`

Implementation of `influent.NetClient` for udp usage.

##### `new influent.UdpClient(options: Object)`

Where options could be like:

```js
{
    // optional
    // --------

    safe_limit: number
}
```

##### `udpClient.query(query: influent.Query)` -> `Promise[Object]`

This method returns rejected `Promise`, cause there is no ability to fetch some data through udp from InfluxDB.

##### `udpClient.write(batch: influent.Batch)` -> `Promise[]`
##### `httpClient.injectUdp(http: influent.Udp)`

Injector of udp service.

______________________

### Class: `influent.DecoratorClient[T: influent.Client]`

Wrapper around `influent.Client` for better usability purposes.

##### `new DecoratorClient([options: Object])`

If options are present, the could contain these optional fields:

```js
database: string
    
// write options
precision:   enum[n, u, ms, s, m, h]
consistency: enum[one, quorum, all, any]
rp:          string
max_batch:   number

// query options
epoch:      enum[n, u, ms, s, m, h]
chunk_size: number
```

##### `decoratorClient.write(data: influent.Batch | Object | influent.Measurement | Array[Object | influent.Measurement][, options: Object])` -> `Promise[]`

When measurement is `Object`, it should have structure like:

```js
{
    // required
    key: string,
    
    // one of or both `value` or non-empty `fields` should be present
    value: string | number | boolean | influent.Type,
    fields: {
        fieldName: string | number | boolean | influent.Type
    },
    
    // optional
    tags: {
        tagName: string
    },
    
    // optional
    timestamp: number | string | Date
}
```

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

### Class: `influent.Type`

______________________

### Class: `influent.I64`
##### `new influent.I64(data: number)`

______________________

### Class: `influent.F64`
##### `new influent.F64(data: number)`

______________________

### Class: `influent.Bool`
##### `new influent.Bool(data: boolean)`

______________________

### Class: `influent.Str`
##### `new influent.Str(data: string)`

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

## Notes

<sup>[1](#browser)</sup>: Browser version is about 41KB minified, and 13KB gzipped.
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
