const Kucoin = require('./src/api'),
    config = require('./config');

let kucoin = new Kucoin(config._api_key, config._api_secret, config._api_latency),
    data = {},
    pricedelimiter = 0.00000001,
    amount = 2000,
    summary = [],
    symbol = 'RPX-BTC';

data.container = {
    last_sell: 0,
    last_buy: 0,
    count: 0
}

let setSell = async () => {
    summary.push('Satış emri ' + data.ticker.sell + pricedelimiter + ' - ' + amount);

    data.container.last_sell = data.ticker.sell - pricedelimiter;
    return kucoin.create_order('SELL', symbol, data.ticker.sell - pricedelimiter, amount);
}

let setBuy = async () => {
    summary.push('Alış emri ' + data.ticker.buy + pricedelimiter + ' - ' + amount);

    data.container.last_buy = data.ticker.buy + pricedelimiter;
    return kucoin.create_order('BUY', symbol, data.ticker.buy + pricedelimiter, amount);
}


let setOrders = async () => {

    //Eski sell orderı temizle
    if (data.active_orders.SELL.length > 0) {
        await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
    }

    //Eski buy orderı temizle
    if (data.active_orders.BUY.length > 0) {
        await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
    }


    let buyOrder = await setBuy();

    let sellOrder = await setSell();


    //Satış order'ı gerçekleştirilmiş mi
    if (sellOrder.orderOid === undefined && buyOrder.orderOid !== undefined) {
        summary.push('Satış için yeterli miktar yok');


        await kucoin.cancel_order('BUY', symbol, buyOrder.orderOid);
        summary.push('Alış emri iptal');

    }

    //Alış order'ı gerçekleştirilmiş mi
    if (buyOrder.orderOid === undefined && sellOrder.orderOid !== undefined) {

        summary.push('Alış için yeterli miktar yok');

        await kucoin.cancel_order('SELL', symbol, sellOrder.orderOid);
        summary.push('Satış emri iptal');

    }

}

let trader = async () => {
    console.log('----------------------');
    summary = [];

    //Get current ticket
    data.ticker = await kucoin.ticker(symbol);


    //Get active orders
    data.active_orders = await kucoin.active_orders(symbol);


    //aktif order yoksa
    if (data.active_orders.BUY.length === 0 && data.active_orders.SELL.length === 0) {

        summary.push('Aktif order yok');


        //iki fiyat arası uygun boşluk var mı?
        if (data.ticker.sell - data.ticker.buy > (pricedelimiter * 2)) {

            summary.push('Fiyat aralığı uygun');

            await setOrders();

        } else {
            summary.push('Fiyat aralığı uygun değil');
        }

    } else if ( //iki order da var ve henüz gerçekleşmemiş
    data.active_orders.SELL.length > 0 &&
    data.active_orders.BUY.length > 0 &&
    data.active_orders.SELL[0][4] === 0 &&
    data.active_orders.BUY[0][4] === 0) {

        summary.push('Henüz işlem görmemiş iki order var');

        //herhangi bir orderının önüne geçen bir order var mı
        if ((data.active_orders.SELL[0][2] > data.ticker.sell) || (data.active_orders.BUY[0][2] < data.ticker.buy)) {
            summary.push('Orderları yeniden sıralıyoruz');
            if (data.ticker.sell - data.ticker.buy > (pricedelimiter * 2)) {
                summary.push('Yeniden sıralama için fiyat aralığı uygun');

                await setOrders();
            } else {
                summary.push('Yeniden sıralama için fiyat aralığı uygun değil');


                await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
                summary.push('Sıralama yapılamadığı için orderlar iptal edildi');
            }

        }


        //orderların altında herhangi bir boşluk varmı


    } else if ( //satış yalnız kaldıysa
    data.active_orders.SELL.length > 0 && data.active_orders.BUY.length === 0) {

        //boşluk varsa yerine taşı
        summary.push('Satış yalnız kaldı :( ');

        if ((data.active_orders.SELL[0][2] > data.ticker.sell)) {

            summary.push('Satış için yer değiştirme gerekiyor.');

            if ((data.container.last_buy < data.ticker.sell - pricedelimiter) && data.container.last_buy !== 0) {
                summary.push('Satış yer değiştiryoruz');
                await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                await kucoin.create_order('SELL', symbol, data.ticker.sell - pricedelimiter, amount);
            } else {
                console.log( data.container.last_buy , data.container.last_buy !== 0);

                summary.push('Satış yer değiştiremiyoruz');
            }

        }

    } else if ( //alış yalnız kaldıysa
    data.active_orders.BUY.length > 0 && data.active_orders.SELL.length === 0) {

        //boşluk varsa yerine taşı
        summary.push('Alış yalnız kaldı :( ');

        if (data.active_orders.BUY[0][2] < data.ticker.buy) {

            summary.push('Alış için değiştirmek gerekiyor');


            if ((data.container.last_sell > data.ticker.buy + pricedelimiter) && data.container.last_sell !== 0) {
                summary.push('Alış yer değiştiryoruz');
                await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
                await kucoin.create_order('BUY', symbol, data.ticker.buy + pricedelimiter, amount);
            } else {
                console.log(data.container.last_sell  , data.container.last_sell !== 0);
                summary.push('Alış yer değiştiremiyoruz');
            }
        }

    }


    console.log(summary.reverse());
    await trader();
}

trader();
//schedule.scheduleJob('*/10 * * * * *', trader);
