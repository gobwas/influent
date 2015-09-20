var utils = require("../../lib/utils");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance");

describe("utils", function() {

    describe("isNumericString()", function() {

        it("should return true when string is numeric", function() {
            // when
            var str = "0123";

            // then
            expect(utils.isNumericString(str)).to.be.true
        });

        it("should return false on non-numeric string", function() {
            // when
            var str = "123a";

            // then
            expect(utils.isNumericString(str)).to.be.false
        });

        it("should return false on non string", function() {
            // when
            var obj = 123;

            // then
            expect(utils.isNumericString(obj)).to.be.false
        });

    });

    describe("chunks()", function() {

        it("should split list well", function() {
            var size;

            // when
            var list = [1,2,3,4];

            // then
            for (size = 1; size <= 5; size++) {
                expect(utils.chunks(list, size)).to.have.length(Math.ceil(list.length / size));
            }
        });

    });

});