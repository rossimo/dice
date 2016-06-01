var _ = require("lodash");
var request = require('request');
var Dice = require("./dice");
var koa = require('koa');
var koaBody = require('koa-body');
var koaRouter = require('koa-router');

var app = koa();
app.use(koaBody());

var router = koaRouter();
var advertisement = process.env.AD ||
    'Thanks for being a part of RPG Talk! If you\'d like to help support development for the community, ' +
    'become a patron at https://www.patreon.com/rpg_talk.';
var skip = JSON.parse(process.env.SKIP_AD || '[]');
var lastAd = {};
var adInterval = 2 * 60 * 60 * 1000;

router.post('/', function *() {
    var user = this.request.body.user_name;

    var command = this.request.body.text;
    console.log('Command: ' + command);

    var dice = new Dice(command);
    dice.execute();

    var result = dice.result();
    var rolls = dice.rolls.map((die) => die.result);
    response = rolls + ' = ' + result;

    this.body = {
        response_type: 'in_channel',
        text: response
    };

    var now = new Date();
    var last = lastAd[user] || new Date();
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