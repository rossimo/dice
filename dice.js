var _ = require("lodash");
var Lexer = require("lex");
var Parser = require("./parse");

var lexer = new Lexer;

// whitespace
lexer.addRule(/\s+/, () => {
    this.reject = true
});

// n-side roller
lexer.addRule(/d/, lexeme => lexeme);

// fudge roller
lexer.addRule(/df/, lexeme => lexeme);

// kept
lexer.addRule(/kh/, lexeme => lexeme);
lexer.addRule(/kl/, lexeme => lexeme);
lexer.addRule(/k/, lexeme => lexeme);
lexer.addRule(/b/, lexeme => lexeme);
lexer.addRule(/w/, lexeme => lexeme);
lexer.addRule(/>/, lexeme => lexeme);
lexer.addRule(/e/, lexeme => lexeme);

// star wars
lexer.addRule(/swa/, lexeme => lexeme);
lexer.addRule(/swd/, lexeme => lexeme);
lexer.addRule(/swp/, lexeme => lexeme);
lexer.addRule(/swc/, lexeme => lexeme);
lexer.addRule(/swb/, lexeme => lexeme);
lexer.addRule(/sws/, lexeme => lexeme);

// digits
lexer.addRule(/[0-9]+/, lexeme => lexeme);

// explosions
lexer.addRule(/!/, lexeme => lexeme);

// arithmetic
lexer.addRule(/[\(\+\-\*\/\)]/, lexeme => lexeme);

var Advantage = {value: 0, consequence: 0, sideEffect: 1};
var Triumph = {value: 1, consequence: 1, sideEffect: 0};
var Success = {value: 1, consequence: 0, sideEffect: 0};
var Failure = {value: 0, consequence: 0, sideEffect: -1};
var Despair = {value: -1, consequence: -1, sideEffect: 0};
var Threat = {value: -1, consequence: 0, sideEffect: 0};

var first = {
    precedence: 4,
    associativity: "left"
};

var second = {
    precedence: 3,
    associativity: "left"
};

var third = {
    precedence: 2,
    associativity: "left"
};

var fourth = {
    precedence: 1,
    associativity: "left"
};

var parser = new Parser({
    "d": first,
    "df": first,
    "kh": second,
    "kl": second,
    "k": second,
    ">": second,
    "b": second,
    "w": second,
    "!": second,
    "e": second,
    "swa": second,
    "swd": second,
    "*": third,
    "/": third,
    "+": fourth,
    "-": fourth
});

function parse(input) {
    lexer.setInput(input);
    var tokens = [], token;
    while (token = lexer.lex()) tokens.push(token);
    return parser.parse(tokens);
}

var Integer = function (value) {
    this.value = value;
};

var Roll = function (min, max) {
    this.min = min;
    this.max = max;
    this.sides = max - min + 1;
    this.dice = [];
};

var Dice = function (command, rng) {
    var self = this;
    self.rolls = [];
    self.stack = [];
    self.kept = [];
    self.command = command;
    self.starwars = [];
    self.rng = rng || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);

    self.operator = {
        "d": function () {
            var arguments = Array.from(arguments);
            var count = arguments.shift() || new Integer(1);
            var sides = arguments.shift() || new Integer(6);

            count = Math.max(Math.min(count.value, 300), 1);
            sides = Math.max(Math.min(sides.value, 300), 1);

            var roll = new Roll(1, sides);
            roll.dice = _.range(count).map(() => self.roll(roll.min, roll.max));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "df": function (count) {
            count = Math.max(Math.min(count.value, 300), 1);

            var roll = new Roll(-1, 1);
            roll.dice = _.range(count).map(() => self.roll(roll.min, roll.max));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "starwars": function (type, count) {
            count = Math.max(Math.min(count.value, 300), 1);

            var sides = [];

            if (type === "swa") {
                sides = [
                    [Success],
                    [Advantage],
                    [Success, Advantage],
                    [Success, Success],
                    [Advantage],
                    [Success],
                    [Advantage, Advantage],
                    []
                ];
            } else if (type === "swd") {
                sides = [
                    [Threat],
                    [Failure],
                    [Threat, Failure],
                    [Threat, Threat],
                    [Failure],
                    [Threat],
                    [Failure, Failure],
                    []
                ];
            } else if (type === "swp") {
                sides = [
                    [Advantage, Advantage],
                    [Advantage],
                    [Advantage, Advantage],
                    [Triumph],
                    [Success],
                    [Success, Advantage],
                    [Success],
                    [Success, Advantage],
                    [Success, Success],
                    [Success, Advantage],
                    [Success, Success],
                    []
                ];
            } else if (type === "swc") {
                sides = [
                    [Threat, Threat],
                    [Threat],
                    [Threat, Threat],
                    [Threat],
                    [Threat, Failure],
                    [Failure],
                    [Threat, Failure],
                    [Failure],
                    [Failure, Failure],
                    [Despair],
                    [Failure, Failure],
                    []
                ];
            } else if (type === "swb") {
                sides = [
                    [Threat],
                    [Threat],
                    [Failure],
                    [Failure],
                    [],
                    [],
                ];
            } else if (type === "sws") {
                sides = [
                    [Success],
                    [Success, Advantage],
                    [Advantage, Advantage],
                    [Advantage],
                    [],
                    [],
                ];
            }

            var roll = new Roll(0, sides.length - 1);
            roll.dice = _.range(count).map(() => self.roll(roll.min, roll.max)).map(result => sides[result]);
            roll.value = _.flatten(roll.dice).map(result => result.value).reduce((x, y) => x + y);
            self.starwars = self.starwars.concat(roll.dice);
            return roll;
        },
        "!": function (roll) {
            var explosions = roll.dice.filter(die => die === roll.max).length;

            while (explosions > 0 && roll.dice.length < 300) {
                var extra = new Roll(roll.min, roll.max);
                extra.dice = _.range(explosions).map(() => self.roll(extra.min, extra.max));
                extra.value = extra.dice.reduce((x, y) => x + y);

                roll.value += extra.value;
                roll.dice = roll.dice.concat(extra.dice);

                explosions = extra.dice.filter(die => die === roll.max).length;
            }

            return roll;
        },
        "kh": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort((l, r) => l < r).slice(0, keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        "kl": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort((l, r) => l > r).slice(0, keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        ">": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift();

            var kept = roll.dice.filter(die => die > keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.length);
        },
        "e": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift();

            var kept = roll.dice.filter(die => die === keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.length);
        },
        "+": function (a, b) {
            return new Integer(a.value + b.value);
        },
        "-": function (a, b) {
            return new Integer(a.value - b.value);
        },
        "*": function (a, b) {
            return new Integer(a.value * b.value);
        },
        "/": function (a, b) {
            return new Integer(a.value / b.value);
        }
    };

    self.operator.k = self.operator.kh;
    self.operator.b = self.operator.kh;
    self.operator.w = self.operator.kl;
    self.operator.swa = self.operator.starwars;
    self.operator.swd = self.operator.starwars;
    self.operator.swp = self.operator.starwars;
    self.operator.swc = self.operator.starwars;
    self.operator.swb = self.operator.starwars;
    self.operator.sws = self.operator.starwars;
};

Dice.prototype.roll = function (min, max) {
    var die = {
        result: this.rng(min, max),
        sides: max - min + 1
    };
    this.rolls.push(die);
    return die.result;
};

Dice.prototype.execute = function () {
    var self = this;
    var i = 0;

    // Moves anything after a ';' symbol to a comment field
    this.comment = "";
    i = self.command.indexOf(";");
    if (i >= 0) {
        self.comment = self.command.substr(i + 1, self.command.length);
        self.command = self.command.substr(0, i);
        if (i <0) { // should only kick in if no ; is found. needs testing
            j = self.command.index0f(":");  
            if (j >= 0) {
                self.comment = self.command.substr(j+1,self.command.length);
                self.command = self.command.substr(0,j);   
    }

    parse(self.command).forEach(function (c) {
        switch (c) {
            case "+":
            case "-":
            case "*":
            case "/":
            case "d":
                var b = self.stack.pop();
                var a = self.stack.pop();
                console.log(c + ':');
                console.log(' ', a);
                console.log(' ', b);

                var r = self.operator[c](a, b);
                self.stack.push(r);
                console.log('  =', r, '\n');
                break;
            case "kh":
            case "kl":
            case "k":
            case "b":
            case "w":
            case ">":
            case "e":
                var b = self.stack.pop();
                var a = self.stack.pop();

                if (a instanceof Roll && b instanceof Roll) {
                    self.stack.push(a);
                    a = undefined;
                } else if (a instanceof Integer && b instanceof Roll) {
                    self.stack.push(a);
                    a = undefined;
                }

                console.log(c + ':');
                console.log(' ', a);
                console.log(' ', b);

                var r = self.operator[c](a, b);
                self.stack.push(r);
                console.log('  =', r, '\n');
                break;
            case "!":
            case "df":
                var a = self.stack.pop();
                console.log(c + ':');
                console.log(' ', a);

                var r = self.operator[c](a);
                self.stack.push(r);
                console.log('  =', r, '\n');
                break;
            case "swa":
            case "swd":
            case "swp":
            case "swc":
            case "swb":
            case "sws":
                var a = self.stack.pop();
                console.log(c + ':');
                console.log(' ', a);

                var r = self.operator[c](c, a);
                self.stack.push(r);
                console.log('  =', r, '\n');
                break;
            default:
                self.stack.push(new Integer(parseInt(c)));
                break;
        }
    });
};

Dice.prototype.onlyStarWars = function () {
    return this.rolls.length > 0 && this.rolls.length === this.starwars.length;
};

Dice.prototype.starWarsResult = function () {
    if (this.onlyStarWars()) {
        var result = _.flatten(this.starwars).reduce((x, y) => ({
            value: x.value + y.value,
            consequence: x.consequence + y.consequence,
            sideEffect: x.sideEffect + y.sideEffect
        }));

        var pl = (count, suffix) => Math.abs(count) > 1 ? suffix : '';

        var descriptions = [];

        var value = result.value;
        if (value !== 0) {
            descriptions.push(Math.abs(value) + ' ' +
                (value > 0 ? 'Success' + pl(value, 'es') : 'Failure' + pl(value, 's')));
        }

        var consequence = result.consequence;
        if (result.consequence !== 0) {
            descriptions.push(Math.abs(consequence) + ' ' +
                (consequence > 0 ? 'Triumph' + pl(consequence, 's') : 'Despair' + pl(consequence, 's')));
        }

        var sideEffect = result.sideEffect;
        if (sideEffect !== 0) {
            descriptions.push(Math.abs(sideEffect) + ' ' +
                (sideEffect > 0 ? 'Advantage' + pl(sideEffect, 's') : 'Threat' + pl(sideEffect, 's')));
        }

        result.description = descriptions.length > 0 ? descriptions.join(', ') : 'No effect';

        result.faces = this.starwars
            .map(face => {
                var names = [];
                var repeat = (count, value) => names.push(new Array(Math.abs(count) + 1).join(value));

                face.forEach(effect => {
                    if (effect.value > 0) repeat(effect.value, 'Success');
                    else if (effect.value < 0) repeat(effect.value, 'Failure');

                    if (effect.consequence > 0) repeat(effect.consequence, 'Triumph');
                    else if (effect.consequence < 0) repeat(effect.consequence, 'Despair');

                    if (effect.sideEffect > 0) repeat(effect.sideEffect, 'Advantage');
                    else if (effect.sideEffect < 0) repeat(effect.sideEffect, 'Threat');
                });

                return names;
            })
            .map(names => names.length > 0 ? '(' + names.join(', ') + ')' : '(Nothing)')
            .join(', ');

        return result;
    } else {
        return undefined;
    }
};

Dice.prototype.result = function () {
    return this.stack[0].value;
};

module.exports = Dice;
