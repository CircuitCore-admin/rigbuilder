import { MarketplaceService } from '../services/marketplace.service';

export async function checkMarketplaceExpiry() {
  try {
    const result = await MarketplaceService.expireListingsAndOffers();
    if (result.expiredListingCount > 0 || result.expiredOfferCount > 0) {
      console.log(
        `[marketplace-expiry] Expired ${result.expiredListingCount} listings, ${result.expiredOfferCount} offers`,
      );
    }
  } catch (err) {
    console.error('[marketplace-expiry] Error running expiry check:', err);
  }
}
