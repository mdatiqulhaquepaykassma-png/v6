import { PrismaClient, UserRole, UserStatus, KYCStatus, TableType, RoundStatus, RoundResult, CardSuit, BetSide, BetStatus, BalanceType, TransactionType } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Dragon Tiger P2P Platform Database Seeding...');

  // 1. Password Hashes (bcrypt cost 12)
  const superAdminPassword = await bcrypt.hash('SuperAdmin@2024!', 12);
  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const merchantPassword = await bcrypt.hash('Merchant@2024!', 12);
  const playerPassword = await bcrypt.hash('Player@2024!', 12);

  // 2. Seed Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@dragonstrike.com',
      phone: '+919876500001',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KYCStatus.VERIFIED,
      realBalance: 1000000.00,
      demoBalance: 100000.00,
      referralCode: 'SUPERADMIN',
    },
  });
  console.log('✅ Super Admin created:', superAdmin.username);

  // 3. Seed Standard Admin
  const admin1 = await prisma.user.upsert({
    where: { username: 'admin1' },
    update: {},
    create: {
      username: 'admin1',
      email: 'admin1@dragonstrike.com',
      phone: '+919876500002',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KYCStatus.VERIFIED,
      realBalance: 500000.00,
      demoBalance: 50000.00,
      referralCode: 'ADMIN1',
    },
  });
  console.log('✅ Admin created:', admin1.username);

  // 4. Seed Merchant User & Merchant Entity
  const merchantUser = await prisma.user.upsert({
    where: { username: 'merchant1' },
    update: {},
    create: {
      username: 'merchant1',
      email: 'merchant@example.com',
      phone: '+919876500003',
      passwordHash: merchantPassword,
      role: UserRole.MERCHANT,
      status: UserStatus.ACTIVE,
      kycStatus: KYCStatus.VERIFIED,
      realBalance: 250000.00,
      demoBalance: 50000.00,
      referralCode: 'MERCHANT1',
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { apiKey: 'mk_test_abc1234567890abcdef1234567890abcdef' },
    update: {},
    create: {
      userId: merchantUser.id,
      companyName: 'TestCasino Ltd',
      apiKey: 'mk_test_abc1234567890abcdef1234567890abcdef',
      apiSecret: 'ms_test_xyz7890123456789abcdef0123456789abcdef0123456789abcdef',
      webhookUrl: 'https://testcasino.example.com/api/webhooks/dragon-tiger',
      callbackUrl: 'https://testcasino.example.com/api/callback',
      commissionRate: 0.0500,
      walletBalance: 500000.00,
      ipWhitelist: ['127.0.0.1', '10.0.0.1'],
    },
  });
  console.log('✅ Merchant created:', merchant.companyName);

  // 5. Seed 10 Players
  const players = [];
  for (let i = 1; i <= 10; i++) {
    const p = await prisma.user.upsert({
      where: { username: `player${i}` },
      update: {},
      create: {
        username: `player${i}`,
        email: `player${i}@test.com`,
        phone: `+91987651000${i}`,
        passwordHash: playerPassword,
        role: UserRole.PLAYER,
        status: UserStatus.ACTIVE,
        kycStatus: i <= 5 ? KYCStatus.VERIFIED : KYCStatus.PENDING,
        realBalance: 5000.00,
        demoBalance: 10000.00,
        referralCode: `PLAYER${i}REF`,
        referredById: i > 1 ? (i % 2 === 0 ? superAdmin.id : admin1.id) : undefined,
      },
    });
    players.push(p);
  }
  console.log(`✅ ${players.length} Players created with ₹5,000 real and ₹10,000 demo each`);

  // 6. Seed Game Tables
  const expressTable = await prisma.gameTable.upsert({
    where: { slug: 'express' },
    update: {},
    create: {
      name: 'Express Table',
      slug: 'express',
      tableType: TableType.EXPRESS,
      minBet: 10.00,
      maxBet: 1000.00,
      bettingDuration: 15,
      dealingDuration: 3,
      nextRoundDelay: 3,
      commissionRate: 0.0500,
      sortOrder: 1,
      playersOnline: 24,
    },
  });

  const classicTable = await prisma.gameTable.upsert({
    where: { slug: 'classic' },
    update: {},
    create: {
      name: 'Classic Table',
      slug: 'classic',
      tableType: TableType.CLASSIC,
      minBet: 100.00,
      maxBet: 10000.00,
      bettingDuration: 30,
      dealingDuration: 3,
      nextRoundDelay: 3,
      commissionRate: 0.0500,
      sortOrder: 2,
      playersOnline: 68,
    },
  });

  const vipTable = await prisma.gameTable.upsert({
    where: { slug: 'vip' },
    update: {},
    create: {
      name: 'VIP High Roller',
      slug: 'vip',
      tableType: TableType.VIP,
      minBet: 1000.00,
      maxBet: 100000.00,
      bettingDuration: 30,
      dealingDuration: 3,
      nextRoundDelay: 3,
      commissionRate: 0.0500,
      sortOrder: 3,
      playersOnline: 12,
    },
  });
  console.log('✅ 3 Game Tables initialized (Express, Classic, VIP)');

  // 7. Seed System Settings
  const settings = [
    { key: 'commission_rate', value: 0.05, category: 'game', description: 'Base platform commission rate (5%)' },
    { key: 'referral_commission_rate', value: 0.01, category: 'referral', description: 'Referral commission share from house commission (1%)' },
    { key: 'default_client_seed', value: 'dragon_tiger_provably_fair_master_seed_2026', category: 'provably_fair', description: 'Active master client seed' },
    { key: 'maintenance_mode', value: false, category: 'system', description: 'Platform maintenance toggle' },
    { key: 'min_deposit_amount', value: 100.00, category: 'wallet', description: 'Minimum deposit requirement in INR' },
    { key: 'min_withdrawal_amount', value: 500.00, category: 'wallet', description: 'Minimum withdrawal requirement in INR' },
    { key: 'auto_approve_withdrawal_limit', value: 50000.00, category: 'finance', description: 'Dual approval threshold for withdrawals' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: {
        key: s.key,
        value: s.value,
        description: s.description,
        category: s.category,
        updatedById: superAdmin.id,
      },
    });
  }
  console.log('✅ System Settings seeded');

  // 8. Seed Realistic Completed Rounds (100 rounds across tables)
  console.log('🎲 Seeding 100 completed Provably Fair rounds...');
  const tables = [classicTable, expressTable, vipTable];
  const suits: CardSuit[] = [CardSuit.HEARTS, CardSuit.DIAMONDS, CardSuit.CLUBS, CardSuit.SPADES];

  let cumulativeRounds = 0;
  for (const tbl of tables) {
    const roundsCount = tbl.slug === 'classic' ? 50 : tbl.slug === 'express' ? 35 : 15;
    for (let r = 1; r <= roundsCount; r++) {
      cumulativeRounds++;
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      const clientSeed = 'dragon_tiger_provably_fair_master_seed_2026';
      const nonce = cumulativeRounds;

      // Realistic outcome distribution (~46% Dragon, ~46% Tiger, ~8% Tie)
      const rand = Math.random();
      let dVal: number;
      let tVal: number;
      let res: RoundResult;

      if (rand < 0.0769) {
        // Tie
        dVal = Math.floor(Math.random() * 13) + 1;
        tVal = dVal;
        res = RoundResult.TIE;
      } else if (rand < 0.5384) {
        // Dragon wins
        dVal = Math.floor(Math.random() * 12) + 2; // 2..13
        tVal = Math.floor(Math.random() * (dVal - 1)) + 1; // 1..(dVal-1)
        res = RoundResult.DRAGON;
      } else {
        // Tiger wins
        tVal = Math.floor(Math.random() * 12) + 2;
        dVal = Math.floor(Math.random() * (tVal - 1)) + 1;
        res = RoundResult.TIGER;
      }

      const dSuit = suits[Math.floor(Math.random() * suits.length)];
      const tSuit = suits[Math.floor(Math.random() * suits.length)];

      const matchedPool = (tbl.slug === 'vip' ? 25000 : tbl.slug === 'classic' ? 5000 : 500) * (Math.floor(Math.random() * 4) + 1);
      const companyCommission = res === RoundResult.TIE ? 0 : matchedPool * 2 * 0.05;
      const tieRevenue = res === RoundResult.TIE ? matchedPool * 2 : 0;

      const completedRound = await prisma.gameRound.create({
        data: {
          roundNumber: BigInt(r),
          tableId: tbl.id,
          status: RoundStatus.COMPLETED,
          dragonCardValue: dVal,
          dragonCardSuit: dSuit,
          tigerCardValue: tVal,
          tigerCardSuit: tSuit,
          result: res,
          serverSeed: serverSeed, // Revealed because settled
          serverSeedHash: serverSeedHash,
          clientSeed: clientSeed,
          nonce: nonce,
          totalDragonBets: matchedPool * 1.1,
          totalTigerBets: matchedPool * 1.05,
          totalMatchedAmount: matchedPool,
          totalRefundedAmount: matchedPool * 0.15,
          companyCommission: companyCommission,
          tieRevenue: tieRevenue,
          totalPayout: res === RoundResult.TIE ? 0 : matchedPool * 1.9,
          playerCount: Math.floor(Math.random() * 10) + 4,
          bettingStartAt: new Date(Date.now() - (roundsCount - r + 1) * 60000),
          bettingEndAt: new Date(Date.now() - (roundsCount - r + 1) * 60000 + 30000),
          dealtAt: new Date(Date.now() - (roundsCount - r + 1) * 60000 + 33000),
          settledAt: new Date(Date.now() - (roundsCount - r + 1) * 60000 + 35000),
          completedAt: new Date(Date.now() - (roundsCount - r + 1) * 60000 + 36000),
        },
      });

      // Add CompanyLedger entry
      await prisma.companyLedger.create({
        data: {
          type: res === RoundResult.TIE ? 'TIE_REVENUE' : 'COMMISSION',
          amount: res === RoundResult.TIE ? tieRevenue : companyCommission,
          balanceBefore: 100000.00,
          balanceAfter: 100000.00 + (res === RoundResult.TIE ? tieRevenue : companyCommission),
          roundId: completedRound.id,
          description: `Settlement revenue for ${tbl.name} Round #${r}`,
        },
      });
    }

    await prisma.gameTable.update({
      where: { id: tbl.id },
      data: { totalRoundsPlayed: BigInt(roundsCount) },
    });
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
