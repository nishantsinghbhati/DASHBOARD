export interface PartnerSpendingSummary {
  totalBusinessExpenses: number;
  partnerTotalExpenses: number; // excluding business account if any
  nishantPaid: number;
  chinmayPaid: number;
  businessAccountPaid: number;
  expectedNishantContribution: number;
  expectedChinmayContribution: number;
  nishantDifference: number; // positive = paid more, negative = paid less
  chinmayDifference: number;
  settlementAmount: number;
  payerName: string | null;
  receiverName: string | null;
  payerId: string | null;
  receiverId: string | null;
  isBalanced: boolean;
}

export function calculatePartnerSpending(
  expenses: Array<{
    amount: number;
    paidBy: string;
    partnerId?: string | null;
    isSettled?: boolean;
  }>
): PartnerSpendingSummary {
  let nishantPaid = 0;
  let chinmayPaid = 0;
  let businessAccountPaid = 0;

  for (const exp of expenses) {
    if (exp.paidBy === 'Nishant' || exp.partnerId === 'PARTNER_NISHANT') {
      nishantPaid += exp.amount;
    } else if (exp.paidBy === 'Chinmay' || exp.partnerId === 'PARTNER_CHINMAY') {
      chinmayPaid += exp.amount;
    } else {
      businessAccountPaid += exp.amount;
    }
  }

  const partnerTotalExpenses = nishantPaid + chinmayPaid;
  const totalBusinessExpenses = partnerTotalExpenses + businessAccountPaid;

  // Expected 50/50 split of partner-funded expenses
  const expectedEach = partnerTotalExpenses / 2;
  const nishantDiff = nishantPaid - expectedEach;
  const chinmayDiff = chinmayPaid - expectedEach;

  // If Nishant paid more, Chinmay owes Nishant the difference: (Nishant - Chinmay) / 2
  let settlementAmount = 0;
  let payerName: string | null = null;
  let receiverName: string | null = null;
  let payerId: string | null = null;
  let receiverId: string | null = null;

  if (nishantPaid > chinmayPaid) {
    settlementAmount = (nishantPaid - chinmayPaid) / 2;
    payerName = 'Chinmay';
    payerId = 'PARTNER_CHINMAY';
    receiverName = 'Nishant';
    receiverId = 'PARTNER_NISHANT';
  } else if (chinmayPaid > nishantPaid) {
    settlementAmount = (chinmayPaid - nishantPaid) / 2;
    payerName = 'Nishant';
    payerId = 'PARTNER_NISHANT';
    receiverName = 'Chinmay';
    receiverId = 'PARTNER_CHINMAY';
  }

  return {
    totalBusinessExpenses,
    partnerTotalExpenses,
    nishantPaid,
    chinmayPaid,
    businessAccountPaid,
    expectedNishantContribution: expectedEach,
    expectedChinmayContribution: expectedEach,
    nishantDifference: nishantDiff,
    chinmayDifference: chinmayDiff,
    settlementAmount: Math.round(settlementAmount * 100) / 100,
    payerName,
    receiverName,
    payerId,
    receiverId,
    isBalanced: settlementAmount === 0,
  };
}
