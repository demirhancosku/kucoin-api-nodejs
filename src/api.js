"use strict";

const _https = require("https");
const _crypto = require("crypto");

class Kucoin {

    constructor(api_key,api_secret,latency) {
        this._api_key = api_key;
        this._api_secret = api_secret;
        this.latency = latency === undefined ? 0 : latency;
        this._nonce = '';
    }


    __signature(endpoint,queryString) //Generate signature
    {
        //Create Sign String
        let signString = endpoint + "/" + this._nonce +"/"+ queryString;
        // examp: /v1/order/active/1509273046136/symbol=RPX-BTC



        //Make it base64
        signString = new Buffer(signString).toString('base64');


        //HMAC256
        let hmac = _crypto.createHmac('sha256', this._api_secret);
        hmac.setEncoding('hex');
        hmac.write(signString);
        hmac.end();

        return hmac.read();
    }

    __nonce() //Get timestamp as nonce
    {
        this._nonce = new Date().getTime();
    }


    __post(method,endpoint,param) //Send post request via
    {
        let self = this;

        return new Promise(function (resolve, reject) {

            let url = '/v1/' + endpoint;

            let post_data = '';
            let body = '';


            Object.keys(param)
                .sort()
                .forEach(function(v, i) {
                    post_data  += v + "=" + param[v] + "&";
                });

            post_data = post_data.substr(0, post_data.length-1);

            let signature = self.__signature(url,post_data);

            if(method === 'GET'){
                url += '?' + self.serialize(param);
            }

            let request = _https.request({
                hostname: 'api.kucoin.com',
                path: url,
                port: 443,
                method: method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'KC-API-KEY' : self._api_key,
                    'KC-API-NONCE' : self._nonce,
                    'KC-API-SIGNATURE' : signature
                }
            }, function (res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    body += chunk;
                });
                res.on('end', function () {
                    resolve(JSON.parse(body).data);
                });

                res.on('error', function (e) {
                    reject(e);
                });
            });//Return answer as object in callback


            if(method === 'POST'){
                request.write(self.serialize(param));
            }

            setTimeout(() => {
                request.end();
            },self.latency);
            return body;
        });

    }

    api_call(method,endpoint, param) //Api call
    {
        this.__nonce();
        return this.__post(method,endpoint,param);
    }


    async active_orders(symbol){
        return this.api_call('GET','order/active',{symbol: symbol});
    }

    async deal_orders(symbol){
        return this.api_call('GET','deal-orders',{symbol: symbol});
    }


    async ticker(symbol) {
        return this.api_call('GET','open/tick',{symbol: symbol})
    }

    async create_order(type,symbol,price,amount) {
        return this.api_call('POST','order',{type:type, symbol: symbol, price : price, amount: amount})
    }

    async cancel_order(type,symbol,orderOid) {
        return this.api_call('POST','cancel-order',{type:type, symbol: symbol, orderOid: orderOid})
    }



    serialize(obj) {
        var str = [];
        for(var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        return str.join("&");
    }
}

module.exports = Kucoin;