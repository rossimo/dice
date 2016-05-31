var Dice = require('../dice');
var assert = require('chai').assert;

describe('Dice', function () {
    it('rolls correct number of n-sided dice', function () {
        var dice = new Dice("3d20");
        dice.execute();

        assert.equal(dice.rolls.length, 3);
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

    it('caps n-sided die rolls at 100', function () {
        var dice = new Dice("150d20");
        dice.execute();

        assert.equal(dice.rolls.length, 100);
    });

    it('caps n-sided die sides at 1000', function () {
        var dice = new Dice("1d1001");
        dice.execute();

        assert.equal(dice.rolls[0].sides, 1000);
    });

    it('caps fudge die rolls at 100', function () {
        var dice = new Dice("150df");
        dice.execute();

        assert.equal(dice.rolls.length, 100);
    });

    it('keeps highest dice', function () {
        var rng = [11, 19, 1];
        var dice = new Dice("3d20kh2", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 30);
    });

    it('autocompletes keep high operator to 1', function () {
        var rng = [11, 19, 1];
        var dice = new Dice("3d20kh+3", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 22);
    });

    it('keeps lowest dice', function () {
        var rng = [11, 19, 1];
        var dice = new Dice("3d20kl2", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 12);
    });

    it('autocompletes keep low operator to 1', function () {
        var rng = [11, 19, 1];
        var dice = new Dice("3d20kl+3", () => rng.pop());
        dice.execute();

        assert.equal(dice.result(), 4);
    });
});