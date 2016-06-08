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

var Dice = function (command, rng) {
    var self = this;
    self.groups = [];
    self.stack = [];
    self.kept = [];
    self.rng = rng || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);
    self.command = command;

    self.Roll = function (count, min, max) {
        this.min = min;
        this.max = max;
        this.sides = max - min + 1;
        this.dice = _.range(count).map(() => self.rng(min, max));
        this.value = this.dice.reduce((x, y) => x + y);
        self.groups.push(this);
    };

    self.operator = {
        "d": function () {
            var arguments = Array.from(arguments);
            var count = arguments.shift() || new Integer(1);
            var sides = arguments.shift() || new Integer(6);

            count = Math.max(Math.min(count.value, 300), 1);
            sides = Math.max(Math.min(sides.value, 300), 1);

            return new self.Roll(count, 1, sides);
        },
        "df": function (count) {
            count = Math.max(Math.min(count.value, 300), 1);

            return new self.Roll(count, -1, 1);
        },
        "!": function (roll) {
            var explosions = roll.dice.filter(die => die === roll.max).length;

            while (explosions > 0 && roll.dice.length < 300) {
                var extra = new self.Roll(explosions, roll.min, roll.max);

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

            var kept = roll.dice.sort().slice(0, keep.value);
            self.kept = self.kept.concat(kept);
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

                if (a instanceof self.Roll && b instanceof self.Roll) {
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

Dice.prototype.rolls = function () {
    return _.flatten(this.groups.map(group => group.dice));
};

Dice.prototype.result = function () {
    return this.stack.pop().value;
};

module.exports = Dice;
