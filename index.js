const Kucoin = require('./src/api'),
    config = require('./config'),
    lang = require('./src/lang/' + config.ui.lang),
    jsonfile = require('jsonfile'),
    beforeExit = require('before-exit');

let kucoin = new Kucoin(config.api.key, config.api.secret, config.api.latency),
    data = {},
    pricedelimiter = config.orders.price_delimiter,
    amount = config.orders.amount,
    summary = [],
    symbol = config.api.pair,
    minimum_amount = 0.00000002; //This is the minimum amount for increasing or decreasing the price

data.container = {
    last_sell: 0,
    last_buy: 0,
    count: 0,
    daily_limit: 10000
}

let setSell = async () => {
    summary.push(lang.sell_order + ' '+ data.ticker.sell + pricedelimiter + ' - ' + amount);

    data.container.last_sell = data.ticker.sell - pricedelimiter;

    data.container.count +=1;
    return kucoin.create_order('SELL', symbol, data.ticker.sell - pricedelimiter, amount);
}

let setBuy = async () => {
    summary.push(lang.buy_order + ' ' + data.ticker.buy + pricedelimiter + ' - ' + amount);

    data.container.last_buy = data.ticker.buy + pricedelimiter;
    data.container.count +=1;
    return kucoin.create_order('BUY', symbol, data.ticker.buy + pricedelimiter, amount);
}


let setOrders = async () => {

    //Cancel the last sell order
    if (data.active_orders.SELL.length > 0) {
        data.container.count +=1;

        let cancel_result = await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
        if(!cancel_result){
            tick();
            return;
        }
    }

    //Cancel the last buy order
    if (data.active_orders.BUY.length > 0) {
        data.container.count +=1;

        let cancel_result = await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
        if(!cancel_result){
            tick();
            return;
        }
    }


    let buyOrder = await setBuy();

    let sellOrder = await setSell();


    //Did the sell order fullfill?
    if (sellOrder.orderOid === undefined && buyOrder.orderOid !== undefined) {
        summary.push(lang.not_enough_amount_for_sell);

        data.container.count +=1;
        let cancel_result = await kucoin.cancel_order('BUY', symbol, buyOrder.orderOid);
        if(!cancel_result){
            tick();
            return;
        }

        summary.push(lang.buy_order_canceled);

    }

    //Did the buy order fullfill?
    if (buyOrder.orderOid === undefined && sellOrder.orderOid !== undefined) {

        summary.push(lang.not_enough_amount_for_buy);

        data.container.count +=1;
        let cancel_result = await kucoin.cancel_order('SELL', symbol, sellOrder.orderOid);
        if(!cancel_result){
            tick();
            return;
        }

        summary.push(lang.sell_order_canceled);

    }

}

let trader = async () => {
    console.log(lang.delimiter);
    summary = [];
    data.container.count = 0;

    //Get current ticket
    data.ticker = await kucoin.ticker(symbol);


    //Get active orders
    data.container.count +=1;
    data.active_orders = await kucoin.active_orders(symbol);


    //If there isn't no active order, we'll try to make a new pair
    if (data.active_orders.BUY.length === 0 && data.active_orders.SELL.length === 0) {

        summary.push(lang.no_active_orders);


        //Is there an available slot to put order pairs in market?
        if (data.ticker.sell - data.ticker.buy > (pricedelimiter + minimum_amount)) { //(pricedelimiter * 2)

            summary.push(lang.market_prices_available_for_order_pair);

            await setOrders();

        } else {
            summary.push(lang.market_prices_not_available_for_order_pair);
        }

    } else if ( //There are two unfullfilled orders
    data.active_orders.SELL.length > 0
    && data.active_orders.BUY.length > 0
    && data.active_orders.SELL[0][4] === 0
    && data.active_orders.BUY[0][4] === 0
    ) {
        summary.push(lang.there_are_two_unfullfilled_orders);

        //Is there a lower or higher price for either one of the pairs ?
        if ((data.active_orders.SELL[0][2] > data.ticker.sell) || (data.active_orders.BUY[0][2] < data.ticker.buy)) {
            summary.push(lang.re_sorting_the_pair);
            if (data.ticker.sell - data.ticker.buy > (pricedelimiter + minimum_amount)) {  //(pricedelimiter * 2)
                summary.push(lang.price_range_is_okay_for_re_sorting);
                await setOrders();
            } else {
                summary.push(lang.price_range_is_not_okay_for_re_sorting);
                data.container.count +=2;
                let cancel_result_sell = await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                if(!cancel_result_sell){
                    tick();
                    return;
                }

                let cancel_result_buy = await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
                if(!cancel_result_buy){
                    tick();
                    return;
                }

                summary.push(lang.orders_are_canceled_because_cannot_re_sort);
            }
        }
        //Is there a lower or higher price for either one of the pairs ?


    } else if ( //Was the sell order left alone?
    data.active_orders.SELL.length > 0
    && data.active_orders.BUY.length === 0
    ) {

        //If there is an available space for sell, move it to there
        summary.push(lang.sell_order_left_alone);

        if ((data.active_orders.SELL[0][2] > data.ticker.sell)) {

            summary.push(lang.sell_needs_to_be_adjusted);

            if ((data.container.last_buy < data.ticker.sell - pricedelimiter) && data.container.last_buy !== 0) {
                summary.push(lang.readjusting_sell_order);
                data.container.count +=2;

                let cancel_result_sell = await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                if(!cancel_result_sell){
                    tick();
                    return;
                }

                await kucoin.create_order('SELL', symbol, data.ticker.sell - pricedelimiter, amount);

            } else {
                //console.log(data.container.last_buy, data.container.last_buy !== 0);
                summary.push(lang.cannot_readjust_sell_order);
            }

        }

    } else if ( //Was the buy order left alone
    data.active_orders.BUY.length > 0
    && data.active_orders.SELL.length === 0
    ) {

        //If there is an available space for sell, move it to there
        summary.push(lang.buy_order_left_alone);

        if (data.active_orders.BUY[0][2] < data.ticker.buy) {
            summary.push(lang.buy_needs_to_be_adjusted);
            if ((data.container.last_sell > data.ticker.buy + pricedelimiter) && data.container.last_sell !== 0) {
                summary.push(lang.readjusting_buy_order);
                data.container.count +=2;

                let cancel_result_buy = await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
                if(!cancel_result_buy){
                    tick();
                    return;
                }

                await kucoin.create_order('BUY', symbol, data.ticker.buy + pricedelimiter, amount);

            } else {
                //console.log(data.container.last_sell, data.container.last_sell !== 0);
                summary.push(lang.cannot_readjust_buy_order);
            }
        }

    }

    tick();
}

let tick = async () => {
    summary.push(lang.api_limit + (data.container.count * (86400 / 10000)).toString() + ' s.');
    console.log(summary.reverse());
    setTimeout(await trader, data.container.count * (86400 / 10000) * 1000);
}

let beforeDie = (jsonfile.readFileSync(config.orders.before_die));

if (Object.keys(beforeDie).length !== 0) {
    data = beforeDie;
}


beforeExit.do(function (signal) {
    jsonfile.writeFileSync(config.orders.before_die, data);
});


trader();
