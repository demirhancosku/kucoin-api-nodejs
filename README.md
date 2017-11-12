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

#Donate

If this repository helped you out feel free to donate.

* ETH: 0xa16e403a594b7c7485556e364a90b37a510f44ff
* NEO: AaSNYM6WSvzN8wFAFS6g82zx3JdbzZNctb
* BTC: 15yy4xSgDKPjvNERMJgSHNW2zUhhgbBbs6

