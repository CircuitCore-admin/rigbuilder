import { prisma } from '../prisma';

/** Run periodically (e.g., every hour) to check if any price alerts should trigger */
export async function checkPriceAlerts() {
  const untriggeredAlerts = await prisma.priceAlert.findMany({
    where: { triggered: false },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, username: true } },
    },
  });

  for (const alert of untriggeredAlerts) {
    // Get latest price for this product
    const latestPrice = await prisma.priceHistory.findFirst({
      where: { productId: alert.productId, currency: alert.currency },
      orderBy: { recordedAt: 'desc' },
    });

    if (latestPrice && latestPrice.price <= alert.targetPrice) {
      // Trigger the alert
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { triggered: true },
      });

      // Create notification
      const currencySymbol = alert.currency === 'GBP' ? '£' : alert.currency === 'EUR' ? '€' : '$';
      await prisma.notification.create({
        data: {
          userId: alert.userId,
          type: 'PRICE_ALERT',
          message: `Price alert! ${alert.product.name} is now ${currencySymbol}${latestPrice.price} (your target: ${currencySymbol}${alert.targetPrice})`,
        },
      }).catch(() => {});
    }
  }
}
