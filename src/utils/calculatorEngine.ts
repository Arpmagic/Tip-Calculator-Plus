import { AdvancedReceipt, PersonShareResult } from '../types/advanced';

export function calculateAdvancedSplit(receipt: AdvancedReceipt): PersonShareResult[] {
  const { items, taxLines, serviceCharges, tipConfig, users } = receipt;
  const activeUserCount = users.length;

  if (activeUserCount === 0) return [];

  // Step 1: Calculate raw subtotals per user based on assigned items
  const userSubtotals: { [userId: string]: number } = {};
  users.forEach(u => { userSubtotals[u.id] = 0; });

  let totalRawSubtotal = 0;

  items.forEach(item => {
    const assignedIds = item.assignedUserIds.length > 0 ? item.assignedUserIds : users.map(u => u.id);
    const splitPrice = item.price / assignedIds.length;

    assignedIds.forEach(userId => {
      if (userSubtotals[userId] !== undefined) {
        userSubtotals[userId] += splitPrice;
      }
    });
    totalRawSubtotal += item.price;
  });

  // Prevent division by zero
  const safeTotalSubtotal = totalRawSubtotal > 0 ? totalRawSubtotal : 1;

  // Step 2: Compute total taxes & service charges
  const totalTax = taxLines.reduce((acc, t) => acc + t.amount, 0);
  const totalService = serviceCharges.reduce((acc, s) => acc + s.amount, 0);
  
  // Tip base calculation (Pre-tax vs Post-tax & exempt fees)
  let tipBase = totalRawSubtotal;
  if (tipConfig.isPostTax) {
    const exemptTaxSum = taxLines.filter(t => t.isExemptFromTip).reduce((acc, t) => acc + t.amount, 0);
    const exemptServiceSum = serviceCharges.filter(s => s.isExemptFromTip).reduce((acc, s) => acc + s.amount, 0);
    tipBase += (totalTax - exemptTaxSum) + (totalService - exemptServiceSum);
  }

  const totalTip = tipConfig.customAmount !== undefined 
    ? tipConfig.customAmount 
    : tipBase * (tipConfig.percent / 100);

  // Step 3: Distribute proportionally per user
  const initialResults: { [userId: string]: Omit<PersonShareResult, 'birthdaySubsidyAdded' | 'finalTotal'> } = {};

  users.forEach(user => {
    const userSub = userSubtotals[user.id] || 0;
    const proportion = userSub / safeTotalSubtotal;

    const userTax = totalTax * proportion;
    const userService = totalService * proportion;
    const userTip = totalTip * proportion;

    initialResults[user.id] = {
      userId: user.id,
      userName: user.name,
      subtotal: userSub,
      proportionalTax: userTax,
      proportionalService: userService,
      tipShare: userTip,
    };
  });

  // Step 4: Handle Birthday Mode
  const birthdayUser = users.find(u => u.isBirthdayPerson);
  const nonBirthdayUsers = users.filter(u => !u.isBirthdayPerson);

  const finalResults: PersonShareResult[] = [];
  let birthdayTotalCost = 0;

  if (birthdayUser && nonBirthdayUsers.length > 0) {
    const bRes = initialResults[birthdayUser.id];
    birthdayTotalCost = bRes.subtotal + bRes.proportionalTax + bRes.proportionalService + bRes.tipShare;
  }

  const subsidyPerPerson = (birthdayUser && nonBirthdayUsers.length > 0) 
    ? birthdayTotalCost / nonBirthdayUsers.length 
    : 0;

  users.forEach(user => {
    const baseRes = initialResults[user.id];
    const isBday = user.isBirthdayPerson;

    let subsidyAdded = 0;
    let finalSum = 0;

    if (isBday) {
      finalSum = 0; // Birthday person pays 0!
      subsidyAdded = 0;
    } else {
      const personalTotal = baseRes.subtotal + baseRes.proportionalTax + baseRes.proportionalService + baseRes.tipShare;
      subsidyAdded = birthdayUser ? subsidyPerPerson : 0;
      finalSum = personalTotal + subsidyAdded;
    }

    finalResults.push({
      ...baseRes,
      birthdaySubsidyAdded: subsidyAdded,
      finalTotal: isBday ? 0 : finalSum,
    });
  });

  return finalResults;
}
