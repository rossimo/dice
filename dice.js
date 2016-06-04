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

// digits
lexer.addRule(/[0-9]+/, lexeme => lexeme);

// explosions
lexer.addRule(/!/, lexeme => lexeme);

// arithmetic
lexer.addRule(/[\(\+\-\*\/\)]/, lexeme => lexeme);

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
    "b": second,
    "w": second,
    "!": second,
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

var Roll = function (sides, value, rolls) {
    this.sides = sides;
    this.value = value;
    this.dice = rolls || [];
};

var Dice = function (command, rng) {
    var self = this;
    self.rolls = [];
    self.stack = [];
    self.command = command;
    self.rng = rng || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);

    self.operator = {
        "d": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var count = arguments.shift() || new Integer(1);
            var sides = arguments.shift() || new Integer(6);

            count = Math.max(Math.min(count.value, 300), 1);
            sides = Math.max(Math.min(sides.value, 300), 1);

            var roll = new Roll(sides);
            roll.dice = _.range(count).map(() => self.roll(1, sides));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "df": function (count) {
            count = Math.max(Math.min(count.value, 300), 1);

            var roll = new Roll(3);
            roll.dice = _.range(count).map(() => self.roll(-1, 1));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "!": function (roll) {
            var explosions = roll.dice.filter(die => die === roll.sides).length;

            while (explosions > 0 && roll.dice.length < 300) {
                var extraRoll = new Roll(roll.sides);
                extraRoll.dice = _.range(explosions).map(() => self.roll(1, extraRoll.sides));
                extraRoll.value = extraRoll.dice.reduce((x, y) => x + y);

                roll.value += extraRoll.value;
                roll.dice = roll.dice.concat(extraRoll.dice);

                explosions = extraRoll.dice.filter(die => die === roll.sides).length;
            }

            return roll;
        },
        "kh": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort((l, r) => l < r).slice(0, keep.value);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        "kl": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort().slice(0, keep.value);
            return new Integer(kept.reduce((x, y) => x + y));
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
                var b = self.stack.pop();
                var a = self.stack.pop();

                if (a instanceof Roll && b instanceof Roll) {
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
            default:
                self.stack.push(new Integer(parseInt(c)));
                break;
        }
    });
};

Dice.prototype.result = function () {
    return this.stack.pop().value;
};

module.exports = Dice;
