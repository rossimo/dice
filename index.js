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
    'Thanks for being a part of RPG Talk! If you\`d like to help support development for the community, ' +
    'become a patron at https://www.patreon.com/rpg_talk.';
var skip = JSON.parse(process.env.SKIP_AD || '[]');

router.post('/', function *() {
    var user = this.request.body.user_name;

    var dice = new Dice(this.request.body.text);
    dice.execute();

    var result = dice.result();
    var rolls = dice.rolls.map((die) => die.result);
    response = rolls + ' = ' + result;

    this.body = {
        response_type: 'in_channel',
        text: response
    };

    if (!_.contains(skip, user)) {
        request.post(this.request.body.response_url, {
            text: advertisement
        });
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen((process.env.PORT || 5000));