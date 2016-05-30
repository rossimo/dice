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

// digits
lexer.addRule(/[0-9]+/, lexeme => lexeme);

// arithmetic
lexer.addRule(/[\(\+\-\*\/\)]/, lexeme => lexeme);

var first = {
    precedence: 3,
    associativity: "left"
};

var second = {
    precedence: 2,
    associativity: "left"
};

var third = {
    precedence: 1,
    associativity: "left"
};

var parser = new Parser({
    "d": first,
    "df": first,
    "*": second,
    "/": second,
    "+": third,
    "-": third
});

function parse(input) {
    lexer.setInput(input);
    var tokens = [], token;
    while (token = lexer.lex()) tokens.push(token);
    return parser.parse(tokens);
}

var Dice = function (command, rng) {
    var self = this;
    self.rolls = [];
    self.stack = [];
    self.command = command;
    self.rng = rng || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);

    self.operator = {
        "d": function (rolls, sides) {
            rolls = Math.min(rolls, 100);
            sides = Math.min(sides, 1000);

            return _.range(rolls)
                .map(() => self.roll(1, sides))
                .reduce((x, y) => x + y);
        },
        "df": function (rolls) {
            rolls = Math.min(rolls, 100);

            return _.range(rolls)
                .map(() => self.roll(-1, 1))
                .reduce((x, y) => x + y);
        },
        "+": function (a, b) {
            return a + b;
        },
        "-": function (a, b) {
            return a - b;
        },
        "*": function (a, b) {
            return a * b;
        },
        "/": function (a, b) {
            return a / b;
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
                var b = +self.stack.pop();
                var a = +self.stack.pop();
                self.stack.push(self.operator[c](a, b));
                break;
            case "df":
                var a = +self.stack.pop();
                self.stack.push(self.operator[c](a));
                break;
            default:
                self.stack.push(parseInt(c));
                break;
        }
    });
};

Dice.prototype.result = function () {
    return this.stack.pop();
};

module.exports = Dice;
