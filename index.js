var _ = require("lodash");
var request = require('request');
var Dice = require("./dice");
var koa = require('koa');
var koaBody = require('koa-body');
var koaRouter = require('koa-router');

var app = koa();
app.use(koaBody());

var router = koaRouter();
var advertisement = process.env.AD;
var skip = JSON.parse(process.env.SKIP_AD || '[]');
var lastAd = {};
var adInterval = 2 * 60 * 60 * 1000;

router.post('/', function *() {
    var user = this.request.body.user_name;
    var channel = this.request.body.channel_name;

    var command = this.request.body.text;
    console.log(user + ' in ' + channel + ' rolled ' + command);

    var response = '';
    var fields = [];

    try {
        var dice = new Dice(command);
        dice.execute();
        var result = dice.result();
        var rolls = dice.rolls.map((die) => die.result);
        response = '@' + user + ' rolled *' + result + '*';
        fields = [{
            title: 'Dice',
            value: command,
            short: true
        }, {
            title: 'Rolls',
            value: rolls.join(' '),
            short: true
        }]
    } catch (error) {
        response = 'Unable to roll "' + command + '"\n' + error.message;
        console.log(error.stack);
    }

    this.body = {
        response_type: 'in_channel',
        attachments: [{
            text: response,
            fields: fields,
            mrkdwn_in: ['text']
        }]
    };

    var now = new Date();
    var last = lastAd[user] || new Date(0);
    var millisSince = now.getTime() - last.getTime();
    if (advertisement && millisSince >= adInterval && !_.includes(skip, user)) {
        lastAd[user] = now;

        request.post({
            url: this.request.body.response_url,
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({text: advertisement})
        });
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen((process.env.PORT || 5000));