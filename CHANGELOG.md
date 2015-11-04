Change log
==========

### 0.5.0 (x-11-2015)
______________________

+ UDP client;
+ Host election for multiple servers;
+ Little possible bugfixes with `max_batch` and other passed in call options;

#### Breaking

+ Renamed `influent.createClient()` to `influent.createHttpClient()`;
+ Renamed `client.writeOne` and `client.writeMany` to `client.write(m, opts)`, where type of `m` is `Array`, and type of `opts` is `Object`. When using `DecoratorClient`, returned from `createHttpClient` or `createUdpClient` – `write` method could accept array or single measurement object.

#### Migration notes
+ If you used `influent.createClient` method, just rename it with `influent.createHttpClient`;
+ All of your `client.writeOne(m, o)` should be renamed as:
 - `client.write(m, o)` if you using default `createHttpClient` or manually instantiated some of `DecoratorClient`;
 - `client.write([m])` if you are using `HttpClient` or `UdpClient` directly;
+ All of your `client.writeMany(m, o)` should be renamed to `client.write(m, o)`;
+ If your where used `new Value(x)` without second parameter it will fail now. Use `influent.type.getInfluxTypeOf` for get the second argument for `Value` constructor;

### 0.4.1 (12-10-2015)
______________________

+ Fixed `ping` behaviour in browser - it now do not requires `X-Influxdb-Version` strictly;
+ Fixed `auth` behaviour in browser - it now works;
+ Added CI tests with `karma`.

### 0.4.0 (22-09-2015)
______________________

+ Add `ping` method.

### 0.3.0 (04-09-2015)
______________________

+ Support for [InfluxDB@0.9.3 changes](https://github.com/gobwas/influent/pull/1#issue-104757844)

### 0.2.3 (04-09-2015)
______________________

+ Bug fixes

### 0.2.1 (05-08-2015)
______________________

+ `epoch` and `precision` options

### 0.1.2 (29-07-2015)
______________________

+ Sort keys for tags and fields for better performance
+ Bug fixes

### 0.1.0 (28-07-2015)
______________________

#### Features

+ Initial functionality.

#### Breaking changes

+ n/a