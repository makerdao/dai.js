pragma solidity ^0.4.19;

import "ds-test/test.sol";

import "./MakerdaoIntegrationPoc.sol";

contract MakerdaoIntegrationPocTest is DSTest {
    MakerdaoIntegrationPoc poc;

    function setUp() public {
        poc = new MakerdaoIntegrationPoc();
    }

    function testFail_basic_sanity() public {
        assertTrue(false);
    }

    function test_basic_sanity() public {
        assertTrue(true);
    }
}
