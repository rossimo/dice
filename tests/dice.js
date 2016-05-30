var Dice = require('../dice');
var assert = require('chai').assert;


describe('Dice', function () {
    it('randomly correct number of n-sided dice', function () {
        var dice = new Dice("3d20");
        dice.execute();

        assert.equal(dice.rolls.length, 3);
    });
});