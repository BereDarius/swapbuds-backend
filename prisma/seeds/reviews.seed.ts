import { PrismaClient, User } from '@prisma/client';

/**
 * Seed reviews for completed trades
 */
export async function seedReviews(
  prisma: PrismaClient,
  users: User[],
  trades: any[],
) {
  console.log('⭐ Seeding reviews...');

  const completedTrades = trades.filter((t) => t.status === 'COMPLETED');

  if (completedTrades.length === 0) {
    console.log('   ⚠️  No completed trades found, skipping reviews');
    return [];
  }

  const reviewsData = [];

  // For each completed trade, create reviews from both parties
  for (const trade of completedTrades) {
    // Proposer reviews responder
    reviewsData.push({
      authorId: trade.proposerId,
      targetId: trade.responderId,
      tradeId: trade.id,
      rating: 5,
      comment:
        'Excellent trader! Communication was great, item was exactly as described. Would trade again!',
    });

    // Responder reviews proposer
    reviewsData.push({
      authorId: trade.responderId,
      targetId: trade.proposerId,
      tradeId: trade.id,
      rating: 5,
      comment:
        'Smooth transaction! Quick delivery and the item was in perfect condition. Highly recommend!',
    });
  }

  const createdReviews = [];
  for (const reviewData of reviewsData) {
    try {
      const review = await prisma.review.create({
        data: reviewData,
      });
      createdReviews.push(review);
    } catch (error) {
      // Skip if already exists
    }
  }

  console.log(`   ✅ Created ${createdReviews.length} reviews`);

  // Update reputation scores based on reviews
  for (const user of users) {
    const receivedReviews = await prisma.review.findMany({
      where: { targetId: user.id },
    });

    if (receivedReviews.length > 0) {
      const avgRating =
        receivedReviews.reduce((sum, r) => sum + r.rating, 0) /
        receivedReviews.length;
      const reputationScore = Math.min(100, 50 + avgRating * 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { reputationScore },
      });
    }
  }

  console.log('✅ Reviews and reputation scores updated');
  return createdReviews;
}
