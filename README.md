# Kucoin Api Wrapper


## API Wrapper

Initialization api wrapper instance

```JavaScript
let kucoin = new Kucoin('apikey', 'secret', 'base_latency');
```

Using endpoints

```JavaScript
let ticker =  await kucoin.ticker('RPX-BTC');

kucoin.create_order('SELL', 'RPX-BTC', ticker.buy, 2000).then(function(response){
    console.log(response);
});
```

## Bot Usage

 
Create config.js

```unix 
cp config.example.js config.js
```

Install npm modules

```unix 
npm install
```

Run main script

```unix 
node index.js
```
