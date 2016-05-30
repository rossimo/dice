var _ = require("lodash");
var Dice = require("./dice");
var koa = require('koa');
var koaBody = require('koa-body');
var koaRouter = require('koa-router');

var app = koa();
app.use(koaBody());

var router = koaRouter();
var allowed = JSON.parse(process.env.ALLOWED || '[]');

router.post('/', function *() {
    var user = this.request.body.user_name;
    var response = 'Only #treasure_room members are allowed to test beta releases. ' +
        'Support development at https://www.patreon.com/rpg_talk';

    if (_.includes(allowed, user)) {
        var dice = new Dice(this.request.body.text);
        dice.execute();

        var result = dice.result();
        var rolls = dice.rolls;
        response = rolls + ' = ' + result;
    }

    this.body = {
        response_type: 'in_channel',
        text: response
    }
});

app.use(router.routes())
app.use(router.allowedMethods());

app.listen((process.env.PORT || 5000));