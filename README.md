# Kucoin Api Wrapper

## Dependencies
* Nodejs 8 and above


## API Wrapper

You can initialize api wrapper instance like;

```JavaScript
let kucoin = new Kucoin('apikey', 'secret', 'base_latency');
```

Then you can use endpoints using await or callback

```JavaScript
let ticker =  await kucoin.ticker('RPX-BTC');

kucoin.create_order('SELL', 'RPX-BTC', ticker.buy, 2000).then(function(response){
    console.log(response);
});
```

## Bot Usage

Firstly you must create a ``config.js`` file in your root directory.
 
Create config.js

```unix 
mv config.example.js config.js
```

Install npm modules

```unix 
npm install
```

Run main script

```unix 
node index.js
```
  