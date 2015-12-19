Change log
==========

### 0.5.2 (7-12-2015)
______________________

+ Bug fixes in browser bundles;
+ More info in error messages from http client;

### 0.5.0 (7-12-2015)
______________________

+ UDP client;
+ Host election for multiple servers;
+ Little possible bugfixes with `max_batch` and other passed in call options;

#### Breaking

+ Renamed `influent.createClient()` to `influent.createHttpClient()`;
+ Renamed `client.writeOne` and `client.writeMany` to `client.write(m, opts)`, where type of `m` is `Array`, and type of `opts` is `Object`. When using `DecoratorClient`, returned from `createHttpClient` or `createUdpClient` – `write` method could accept array or single measurement object;
+ Removed `influent.type.{INT64, FLOAT64, BOOLEAN, STRING}` and added constructors instead: `influent.{I64, F64, Bool, Str}`;
+ All of inner `influent.Client` implementations now receive `influent.Batch` object in `write` method and `influent.Query` in `query` method;
+ `influent.DecoratorClient` now is not inheritor of `influent.Client` – it is separate wrapper object.

#### Migration notes
+ If you used `influent.createClient` method, just rename it with `influent.createHttpClient`;
+ All of your `client.writeOne(m, o)` should be renamed as:
 - `client.write(m, o)` if you using default `createHttpClient` or manually instantiated some of `DecoratorClient`;
 - `client.write([m])` if you are using `HttpClient` or `UdpClient` directly;
+ All of your `client.writeMany(m, o)` should be renamed to `client.write(m, o)`;
+ All of your `new Value(x)` or `write({key:"a", value: { data: 10, type: influent.type.STRING }})` will fail now. Users should use OOP version of types if they want to be explicit: `new influent.Str("hello"), new influent.I64(1), new influent.F64(1.1), new influent.Bool(true)`; for implicit version with decorator client (which is used by default) – type will automatically inherited (all numbers to `F64`) – `.write({key:"a", value: 10})` will write 10 as `float64` to InfluxDB.

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