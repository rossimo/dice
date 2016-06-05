var Dice = require('../dice');
var assert = require('chai').assert;

describe('Dice', function () {
    it('rolls correct number of n-sided dice', function () {
        var dice = new Dice("3d20");
        dice.execute();

        assert.equal(dice.rolls.length, 3);
    });

    it('infers 1d6 when operands are missing', function () {
        var dice = new Dice("d", () => 3);
        dice.execute();

        var roll = dice.stack.pop();
        assert.equal(roll.value, 3);
        assert.equal(roll.sides, 6);
        assert.equal(roll.dice.length, 1);
    });

    it('rolls correct number of fudge dice', function () {
        var dice = new Dice("4df");
        dice.execute();

        assert.equal(dice.rolls.length, 4);
    });

    it('follows pre-seeded RNG for tests', function () {
        var dice = new Dice("3d20", () => 2);
        dice.execute();

        assert.equal(dice.result(), 6);
    });

    it('does arithmetic', function () {
        var dice = new Dice("3+2");
        dice.execute();

        assert.equal(dice.result(), 5);
    });

    it('allows spaces', function () {
        var dice = new Dice("1d20 + 3", () => 1);
        dice.execute();

        assert.equal(dice.result(), 4);
    });

    it('caps n-sided die rolls at 300', function () {
        var dice = new Dice("350d20");
        dice.execute();

        assert.equal(dice.rolls.length, 300);
    });

    it('caps n-sided die sides at 300', function () {
        var dice = new Dice("1d1001");
        dice.execute();

        assert.equal(dice.rolls[0].sides, 300);
    });

    it('caps fudge die rolls at 300', function () {
        var dice = new Dice("350df");
        dice.execute();

        assert.equal(dice.rolls.length, 300);
    });

    it('caps exploding dice at 300', function () {
        var dice = new Dice("1d1!");
        dice.execute();

        assert.equal(dice.rolls.length, 300);
    });

    it('keeps highest dice', function () {
        var rng = [11, 19, 1].reverse();
        var dice = new Dice("3d20kh2", () => rng.pop());
        dice.execute();

        assert.equal(dice.kept[0], 19);
        assert.equal(dice.kept[1], 11);
        assert.equal(dice.result(), 30);
    });

    it('keeps highest dice with shorthand', function () {
        var rng = [11, 19, 1].reverse();
        var dice = new Dice("3d20k2", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 30);
    });

    it('autocompletes keep high operator to 1', function () {
        var rng = [11, 19, 1].reverse();
        var dice = new Dice("3d20kh+3", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 22);
    });

    it('keeps lowest dice', function () {
        var rng = [11, 19, 1].reverse();
        var dice = new Dice("3d20kl2", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 12);
    });

    it('autocompletes keep low operator to 1', function () {
        var rng = [11, 19, 1].reverse();
        var dice = new Dice("3d20kl+3", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 4);
    });

    it('autocompletes bucketed dice', function () {
        var rng = [6, 1].reverse();
        var dice = new Dice("2d6b", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 6);
    });

    it('autocompletes worse dice', function () {
        var rng = [6, 1].reverse();
        var dice = new Dice("2d6w", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 1);
    });

    it('keeps low for fudge dice', function () {
        var rng = [-1, 0, 1].reverse();
        var dice = new Dice("3dfkl", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), -1);
    });

    it('explodes dice', function () {
        var rng = [6, 6, 1].reverse();
        var dice = new Dice("1d6!", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 13);
    });

    it('shorthand works on complex commands', function () {
        var dice = new Dice("1d20+3d6k", () => 1);
        dice.execute();

        assert.equal(dice.result(), 2);
    });
});