pragma solidity ^0.4.19;

contract MakerdaoIntegrationPoc {

   function marginTrade(uint leverage, TubInterface tub, OtcInterface otc) public payable returns (bytes32 cup) {
        uint ethAmount = msg.value;
        tub.gem().deposit.value(ethAmount)();
        tub.gem().approve(tub, uint(-1));
        tub.skr().approve(tub, uint(-1));
        tub.sai().approve(otc, uint(-1));

        uint totSaiNeeded = otc.getPayAmount(tub.sai(), tub.gem(), wmul(ethAmount, sub(leverage, WAD))); // Check in the actual market how much total SAI is needed to get this desired WETH value
        uint totSaiDrawn = 0; // Total SAI drawn
        uint saiDrawn = 0; // Sai drawn in one cycle
        uint initialSaiBalance = tub.sai().balanceOf(this); // Check actual balance of SAI of the proxy
        cup = tub.open(); // Open a new CDP
        while (totSaiDrawn < totSaiNeeded) { // While there is still SAI pending to be drawn
            (ethAmount, saiDrawn) = marginNow(tub, otc, cup, ethAmount, tub.mat(), sub(totSaiNeeded, totSaiDrawn), initialSaiBalance);
            totSaiDrawn = add(totSaiDrawn, saiDrawn); // Add SAI drawn to accumulator
        }
        tub.join(_ethToSkr(tub, ethAmount)); // Convert last WETH to SKR
        tub.lock(cup, _ethToSkr(tub, ethAmount)); // Lock last SKR
        tub.give(cup, msg.sender); // Assign cup to caller address
    }

}
