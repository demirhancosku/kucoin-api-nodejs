const Kucoin = require('./src/api'),
    config = require('./config'),
    lang = require('./src/lang/' + config.ui.lang);

let kucoin = new Kucoin(config.api.key, config.api.secret, config.api.latency),
    data = {},
    pricedelimiter = config.orders.price_delimiter,
    amount = config.orders.amount,
    summary = [],
    symbol = config.api.pair,
    minimum_amount = 0.00000001; //This is the minimum amount for increasing or decreasing the price

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

    //Cancel the last sell order
    if (data.active_orders.SELL.length > 0) {
        await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
    }

    //Cancel the last buy order
    if (data.active_orders.BUY.length > 0) {
        await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
    }


    let buyOrder = await setBuy();

    let sellOrder = await setSell();


    //Did the sell order fullfill?
    if (sellOrder.orderOid === undefined && buyOrder.orderOid !== undefined) {
        summary.push(lang.not_enough_amount_for_sell);

        await kucoin.cancel_order('BUY', symbol, buyOrder.orderOid);
        summary.push(lang.buy_order_canceled);

    }

    //Did the buy order fullfill?
    if (buyOrder.orderOid === undefined && sellOrder.orderOid !== undefined) {

        summary.push(lang.not_enough_amount_for_buy);

        await kucoin.cancel_order('SELL', symbol, sellOrder.orderOid);
        summary.push(lang.sell_order_canceled);

    }

}

let trader = async () => {
    console.log(lang.delimiter);
    summary = [];

    //Get current ticket
    data.ticker = await kucoin.ticker(symbol);


    //Get active orders
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
                await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
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
                await kucoin.cancel_order('SELL', symbol, data.active_orders.SELL[0][5]);
                await kucoin.create_order('SELL', symbol, data.ticker.sell - pricedelimiter, amount);
            } else {
                console.log(data.container.last_buy, data.container.last_buy !== 0);
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
                await kucoin.cancel_order('BUY', symbol, data.active_orders.BUY[0][5]);
                await kucoin.create_order('BUY', symbol, data.ticker.buy + pricedelimiter, amount);
            } else {
                console.log(data.container.last_sell, data.container.last_sell !== 0);
                summary.push(lang.cannot_readjust_buy_order);
            }
        }

    }

    console.log(summary.reverse());
    await trader();
}

trader();
