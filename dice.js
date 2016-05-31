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

// digits
lexer.addRule(/[0-9]+/, lexeme => lexeme);

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

var Integer = function(value) {
    this.value = value;
};

var Roll = function(value, rolls) {
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
        "d": function (count, sides) {
            count = Math.min(count.value, 100);
            sides = Math.min(sides.value, 1000);

            var roll = new Roll();
            roll.dice = _.range(count).map(() => self.roll(1, sides));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "df": function (count) {
            count = Math.min(count.value, 100);

            var roll = new Roll();
            roll.dice = _.range(count).map(() => self.roll(-1, 1));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        "kh": function (roll, keep) {
            var kept = roll.dice.sort((l, r) => l < r).slice(0, keep.value);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        "kl": function (roll, keep) {
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
    }
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
            case "kh":
            case "kl":
                var b = self.stack.pop();
                var a = self.stack.pop();
                self.stack.push(self.operator[c](a, b));
                break;
            case "df":
                var a = self.stack.pop();
                self.stack.push(self.operator[c](a));
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
