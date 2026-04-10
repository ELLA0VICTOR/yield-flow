function includesText(error, fragment) {
  return String(error?.message || '')
    .toLowerCase()
    .includes(fragment.toLowerCase());
}

export function isUserRejectedError(error) {
  return (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    error?.reason === 'rejected' ||
    includesText(error, 'user rejected') ||
    includesText(error, 'rejected the request') ||
    includesText(error, 'action_rejected')
  );
}

export function getFriendlyWalletMessage(error, action = 'request') {
  if (isUserRejectedError(error)) {
    const byAction = {
      connect: 'Wallet connection canceled.',
      switch: 'Network switch canceled.',
      request: 'Wallet request canceled.',
    };

    return {
      tone: 'info',
      inline: false,
      message: byAction[action] || byAction.request,
    };
  }

  if (includesText(error, 'no wallet provider') || includesText(error, 'no compatible wallet')) {
    return {
      tone: 'error',
      inline: false,
      message: 'No compatible wallet was found in this browser.',
    };
  }

  return {
    tone: 'error',
    inline: true,
    message: action === 'switch' ? 'Unable to switch wallet network.' : 'Unable to connect wallet.',
  };
}

export function getFriendlyTransactionMessage(error, action = 'request') {
  if (isUserRejectedError(error)) {
    const byAction = {
      approve: 'Approval canceled.',
      deposit: 'Deposit canceled.',
      withdraw: 'Withdraw canceled.',
      quote: 'Quote request canceled.',
      request: 'Request canceled.',
    };

    return {
      tone: 'info',
      message: byAction[action] || byAction.request,
    };
  }

  if (includesText(error, 'insufficient funds')) {
    return {
      tone: 'error',
      message: 'Insufficient funds for this transaction or network gas.',
    };
  }

  if (includesText(error, 'simulation')) {
    return {
      tone: 'error',
      message: 'The transaction simulation failed. Double-check the amount and selected vault.',
    };
  }

  if (action === 'approve') {
    return {
      tone: 'error',
      message: 'Approval failed. Please review the token and try again.',
    };
  }

  if (action === 'deposit') {
    return {
      tone: 'error',
      message: 'Deposit failed. Please review the quote, amount, and network.',
    };
  }

  if (action === 'withdraw') {
    return {
      tone: 'error',
      message: 'Withdraw failed. Please review the amount, network, and exit path.',
    };
  }

  if (action === 'quote') {
    return {
      tone: 'error',
      message: 'Unable to prepare a quote right now.',
    };
  }

  return {
    tone: 'error',
    message: 'Something went wrong. Please try again.',
  };
}
