import BigNumber from 'bignumber.js';
const MAX_ROUNDS = 32;

// Rank-Any, Total-Majority, Stop-On-Total-Majority, Stop-When-2-Remain
// see: https://forum.makerdao.com/t/the-instant-run-off-voting-rabbithole/5340
// new default IRV algo
export const rankedChoiceIRV = votes => {
  const totalMkrParticipation = votes.reduce(
    (acc, cur) => BigNumber(cur.mkrSupport || 0).plus(acc),
    BigNumber(0)
  );

  const tally = {
    rounds: 1,
    winner: null,
    totalMkrParticipation,
    options: {},
    numVoters: votes.length
  };

  const defaultOptionObj = {
    firstChoice: BigNumber(0),
    transfer: BigNumber(0),
    winner: false,
    eliminated: false
  };

  // if there are no votes, don't do anything
  if (votes.length === 0) {
    return tally;
  }

  // run the first round
  votes.forEach(vote => {
    // take the highest preference option from each voter's ballot
    vote.choice = vote.ballot.pop();
    if (!tally.options[vote.choice])
      tally.options[vote.choice] = { ...defaultOptionObj };

    tally.options[vote.choice].firstChoice = BigNumber(
      tally.options[vote.choice].firstChoice
    ).plus(vote.mkrSupport || 0);
  });

  // does any candidate have the majority after the first round?
  Object.entries(tally.options).forEach(([option, { firstChoice }]) => {
    if (firstChoice.gt(totalMkrParticipation.div(2))) tally.winner = option;
  });

  // if so we're done; return the winner
  if (tally.winner) {
    tally.options[tally.winner].winner = true;
    return tally;
  }

  // if we couldn't find a winner based on first preferences, run additional rounds until we find one
  while (!tally.winner) {
    tally.rounds++;
    // find the weakest candidate
    const filteredOptions = Object.entries(tally.options).filter(
      ([, optionDetails]) => !optionDetails.eliminated
    );
    const [optionToEliminate] = filteredOptions.reduce((prv, cur) => {
      const [, prvVotes] = prv;
      const [, curVotes] = cur;
      if (
        curVotes.firstChoice
          .plus(curVotes.transfer)
          .lt(prvVotes.firstChoice.plus(prvVotes.transfer))
      )
        return cur;
      return prv;
    });

    // mark the weakest as eliminated
    tally.options[optionToEliminate].eliminated = true;

    // a vote needs to be moved if...
    // 1) it's currently for the eliminated candidate
    // 2) there's another choice further down in the voter's preference list
    const votesToBeMoved = votes
      .map((vote, index) => ({ ...vote, index }))
      .filter(vote => parseInt(vote.choice) === parseInt(optionToEliminate))
      .filter(vote => vote.ballot[vote.ballot.length - 1] !== 0);

    // move votes to the next choice on their preference list
    votesToBeMoved.forEach(vote => {
      const prevChoice = votes[vote.index].choice;
      votes[vote.index].choice = votes[vote.index].ballot.pop();
      if (!tally.options[votes[vote.index].choice])
        tally.options[votes[vote.index].choice] = { ...defaultOptionObj };

      if (tally.options[votes[vote.index].choice].eliminated) {
        votes[vote.index].choice = votes[vote.index].ballot.pop();
        let validVoteFound = false;

        while (votes[vote.index].choice !== 0) {
          if (!tally.options[votes[vote.index].choice])
            tally.options[votes[vote.index].choice] = { ...defaultOptionObj };
          if (!tally.options[votes[vote.index].choice].eliminated) {
            validVoteFound = true;
            break;
          }
          votes[vote.index].choice = votes[vote.index].ballot.pop();
        }

        if (!validVoteFound) return;
      }
      if (!tally.options[votes[vote.index].choice].eliminated) {
        tally.options[votes[vote.index].choice].transfer = BigNumber(
          tally.options[votes[vote.index].choice].transfer
        ).plus(vote.mkrSupport || 0);

        tally.options[prevChoice].transfer = BigNumber(
          tally.options[prevChoice].transfer
        ).minus(vote.mkrSupport || 0);
      }
    });

    // look for a candidate with the majority
    Object.entries(tally.options).forEach(
      ([option, { firstChoice, transfer }]) => {
        if (firstChoice.plus(transfer).gt(totalMkrParticipation.div(2)))
          tally.winner = option;
      }
    );

    // count the number of options that haven't been eliminated
    const remainingOptions = Object.entries(tally.options).filter(
      ([, optionDetails]) => !optionDetails.eliminated
    ).length;

    // if there are no more rounds,
    // or if there is only one opiton remaining
    // the winner is the option with the most votes
    if (
      (tally.rounds > MAX_ROUNDS && !tally.winner) ||
      (remainingOptions === 1 && !tally.winner)
    ) {
      let max = BigNumber(0);
      let maxOption;
      Object.entries(tally.options).forEach(
        ([option, { firstChoice, transfer }]) => {
          if (firstChoice.plus(transfer).gt(max)) {
            max = firstChoice.plus(transfer);
            maxOption = option;
          }
        }
      );

      tally.winner = maxOption;
    }

    // sanity checks
    if (Object.keys(tally.options).length === 2 && !tally.winner) {
      // dead tie. this seems super unlikely, but it should be here for completeness
      // return the tally without declaring a winner
      return tally;
    }
    if (Object.keys(tally.options).length === 1) {
      // this shouldn't happen
      throw new Error(`Invalid ranked choice tally ${tally.options}`);
    }
    // if we couldn't find one, go for another round
  }

  tally.options[tally.winner].winner = true;
  return tally;
};

// Rank-Any, Total-Majority, Stop-On-Total-Majority, Stop-When-2-Remain
// formerly the default IRV algo
export const rankedChoiceIRVAlt = votes => {
  const totalMkrParticipation = votes.reduce(
    (acc, cur) => BigNumber(cur.mkrSupport || 0).plus(acc),
    BigNumber(0)
  );

  const tally = {
    rounds: 1,
    winner: null,
    totalMkrParticipation,
    options: {},
    numVoters: votes.length
  };
  const defaultOptionObj = {
    firstChoice: BigNumber(0),
    transfer: BigNumber(0),
    winner: false,
    eliminated: false
  };

  if (votes.length === 0) {
    return tally;
  }

  // run the first round
  votes.forEach(vote => {
    vote.choice = vote.ballot.pop();
    if (!tally.options[vote.choice])
      tally.options[vote.choice] = { ...defaultOptionObj };

    tally.options[vote.choice].firstChoice = BigNumber(
      tally.options[vote.choice].firstChoice
    ).plus(vote.mkrSupport || 0);
  });

  // does any candidate have the majority after the first round?
  Object.entries(tally.options).forEach(([option, { firstChoice }]) => {
    if (firstChoice.gt(totalMkrParticipation.div(2))) tally.winner = option;
  });

  // if so, we're done. Return the winner
  if (tally.winner) {
    tally.options[tally.winner].winner = true;
    return tally;
  }

  // if we couldn't find a winner based on first preferences, run additionaly irv rounds until we find one
  while (!tally.winner) {
    tally.rounds++;
    // eliminate the weakest candidate
    const filteredOptions = Object.entries(tally.options).filter(
      ([, optionDetails]) => !optionDetails.eliminated
    );

    const [optionToEliminate] = filteredOptions.reduce((prv, cur) => {
      const [, prvVotes] = prv;
      const [, curVotes] = cur;
      if (
        curVotes.firstChoice
          .plus(curVotes.transfer)
          .lt(prvVotes.firstChoice.plus(prvVotes.transfer))
      )
        return cur;
      return prv;
    });

    tally.options[optionToEliminate].eliminated = true;
    // a vote needs to be moved if...
    // 1) it's currently for the eliminated candidate
    // 2) there's another choice further down in the voter's preference list
    const votesToBeMoved = votes
      .map((vote, index) => ({ ...vote, index }))
      .filter(vote => parseInt(vote.choice) === parseInt(optionToEliminate))
      .filter(vote => vote.ballot[vote.ballot.length - 1] !== 0);

    // move votes to the next choice on their preference list
    votesToBeMoved.forEach(vote => {
      const prevChoice = votes[vote.index].choice;
      votes[vote.index].choice = votes[vote.index].ballot.pop();
      if (!tally.options[votes[vote.index].choice])
        tally.options[votes[vote.index].choice] = { ...defaultOptionObj };

      if (tally.options[votes[vote.index].choice].eliminated) {
        votes[vote.index].choice = votes[vote.index].ballot.pop();
        let validVoteFound = false;

        while (votes[vote.index].choice !== 0) {
          if (!tally.options[votes[vote.index].choice])
            tally.options[votes[vote.index].choice] = { ...defaultOptionObj };
          if (!tally.options[votes[vote.index].choice].eliminated) {
            validVoteFound = true;
            break;
          }
          votes[vote.index].choice = votes[vote.index].ballot.pop();
        }

        if (!validVoteFound) return;
      }
      if (!tally.options[votes[vote.index].choice].eliminated) {
        tally.options[votes[vote.index].choice].transfer = BigNumber(
          tally.options[votes[vote.index].choice].transfer
        ).plus(vote.mkrSupport || 0);

        tally.options[prevChoice].transfer = BigNumber(
          tally.options[prevChoice].transfer
        ).minus(vote.mkrSupport || 0);
      }
    });

    // look for a candidate with the majority
    Object.entries(tally.options).forEach(
      ([option, { firstChoice, transfer }]) => {
        if (firstChoice.plus(transfer).gt(totalMkrParticipation.div(2)))
          tally.winner = option;
      }
    );

    //if there's no more rounds, or if there is one or fewer options that haven't been eliminated
    // the winner is the option with the most votes
    if (
      (tally.rounds > MAX_ROUNDS && !tally.winner) ||
      ((filteredOptions.length === 1 || filteredOptions.length === 0) &&
        !tally.winner)
    ) {
      let max = BigNumber(0);
      let maxOption;
      Object.entries(tally.options).forEach(
        ([option, { firstChoice, transfer }]) => {
          if (firstChoice.plus(transfer).gt(max)) {
            max = firstChoice.plus(transfer);
            maxOption = option;
          }
        }
      );
      tally.winner = maxOption;
    }

    // sanity checks
    if (Object.keys(tally.options).length === 2) {
      // dead tie. this seems super unlikely, but it should be here for completeness
      // return the tally without declaring a winner
      return tally;
    }
    if (Object.keys(tally.options).length === 1) {
      // this shouldn't happen
      throw new Error(`Invalid ranked choice tally ${tally.options}`);
    }
    // if we couldn't find one, go for another round
  }

  tally.options[tally.winner].winner = true;
  return tally;
};
