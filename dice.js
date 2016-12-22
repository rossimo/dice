// this file does the work of turning input into results
// for the slack front end work, look at index.js
// index.js sends the input here to be carved into command and comment
// command is then turned into results
// results and comment are sent back to index.js for presentation

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

// game master
lexer.addRule(/gm/, lexeme => lexeme);

// digits
lexer.addRule(/[0-9]+/, lexeme => lexeme);

// explosions
lexer.addRule(/!/, lexeme => lexeme);

// arithmetic
lexer.addRule(/[\(\+\-\*\/\)]/, lexeme => lexeme);

// part of the star wars dice manager
var Advantage = {value: 0, consequence: 0, sideEffect: 1};
var Triumph = {value: 1, consequence: 1, sideEffect: 0};
var Success = {value: 1, consequence: 0, sideEffect: 0};
var Failure = {value: 0, consequence: 0, sideEffect: -1};
var Despair = {value: -1, consequence: -1, sideEffect: 0};
var Threat = {value: -1, consequence: 0, sideEffect: 0};

// part of the aprser. Used to set solution heirachy to ensure 2d6+1 follows bodmas
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

// assigns bodmas heirachy levels to different tokens
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
    "gm": second,
    "*": third,
    "/": third,
    "+": fourth,
    "-": fourth
});

// this function looks for tokens
// while there's a token to find it stacks it into tokens[]
//then parses each one to set the bodmas heirachy
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
        // "d" is for standard XdY format dice
        "d": function () {  
            var arguments = Array.from(arguments);
            var count = arguments.shift() || new Integer(1);
            var sides = arguments.shift() || new Integer(6);

            count = Math.max(Math.min(count.value, 300), 1);
            sides = Math.max(Math.min(sides.value, 300), 1); // ideally this would be 1000 to allow the rare game use of d1000

            var roll = new Roll(1, sides);
            roll.dice = _.range(count).map(() => self.roll(roll.min, roll.max));
            roll.value = roll.dice.reduce((x, y) => x + y);

            return roll;
        },
        // fudge dice. two '-1' sides, two '0' sides and two '+1' sides
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
        // explosive dice. eg if 10 on a d10nnroll an extra dice
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
        // keep  high
        "kh": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort((l, r) => l < r).slice(0, keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        // keep low
        "kl": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift() || new Integer(1);

            var kept = roll.dice.sort((l, r) => l > r).slice(0, keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.reduce((x, y) => x + y));
        },
        // keep greater than
        ">": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift();

            var kept = roll.dice.filter(die => die > keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.length);
        },
        // keep equal to. (eg roll 5 dice and count the 6's)
        "e": function () {
            var arguments = Array.from(arguments).filter(arg => arg !== undefined);
            var roll = arguments.shift();
            var keep = arguments.shift();

            var kept = roll.dice.filter(die => die === keep.value);
            self.kept = self.kept.concat(kept);
            return new Integer(kept.length);
        },
        // not currently working
        "gm": function () {
            var sides = [
                    ["Separate them"],
                    ["Put them together"],
                    ["Show their connection"],
                    ["Show their connection increasing"],
                    ["Show their connection strained"],
                    ["The weather obstructs you"],
                    ["The landscape obstructs you"],
                    ["The enviroment obstructs you"],
                    ["A beast obstructs you"],
                    ["An NPC obstructs you"],
                    ["Your past obstructs you"],
                    ["Your equipment obstructs you"],
                    ["An old friend makes contact"],
                    ["An old enemy reappears"],
                    ["Something bad on the horizon"],
                    ["Something you believe in happens"],
                    ["Something good happens"],
                    ["Something useful happens"],
                    ["You lose some equipment"],
                    ["You lose a resource"],
                    ["You find a trap"],
                    ["Tensions escalate"],
                    ["Show what your character is good at"],
                    ["Show what your character likes"],
                    ["Show what your character thinks of another character"],
                    ["Someone has a job for you"],
                    ["Someone has an offer for you"],
                    ["Someone has something you want"],
                    ["It is valuable, but the price is high"],
                    ["Lose something, or another character is hurt"],
                    []
                ];
            var roll = new Roll(0, sides.length - 1);
            var count = arguments.shift() || new Integer(1);
            count = Math.max(Math.min(count.value, 10), 1);  // no more then 10 gm results to not gum up screen with text
            roll.dice = _.range(count).map(() => self.roll(roll.min, roll.max));
            roll.value = roll.dice.reduce((x, y) => x + y);
            self.comment = sides[roll.value] + " " + self.comment
            return roll;
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

    // a tidy up block to allow multiple intutiive shortforms summon the same function
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
            case "gm":
                console.log(c + ':');
                var r = self.operator[c]();
                self.stack.push(r);
                console.log('  =', r, '\n');
                break;
            default:
                self.stack.push(new Integer(parseInt(c))); // will throw a NaN error if it encounters a non integer result
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
