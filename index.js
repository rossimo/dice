var _ = require("lodash");
var Lexer = require("lex");
var Parser = require("./parse");

var lexer = new Lexer;

// whitespace
lexer.addRule(/\s+/);

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

var rolls = [];

function roll(min, max) {
    var die = Math.floor(Math.random() * (max - min + 1)) + min;
    rolls.push(die);
    return die;
}

var operator = {
    "d": function (a, b) {
        return _.range(a)
            .map(() => roll(1, b))
            .reduce((x, y) => x + y);
    },
    "df": function (a) {
        return _.range(a)
            .map(() => roll(-1, 1))
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
};

var stack = [];

parse("(3d20-4df+1df)*2").forEach(function (c) {
    switch (c) {
        case "+":
        case "-":
        case "*":
        case "/":
        case "d":
            var b = +stack.pop();
            var a = +stack.pop();
            stack.push(operator[c](a, b));
            break;
        case "df":
            var a = +stack.pop();
            stack.push(operator[c](a));
            break;
        default:
            stack.push(parseInt(c));
    }
});

var output = stack.pop();
console.log(rolls);
console.log(output);