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
});