// ============================================================================
// RigBuilder — Database seed
// Run: npx tsx prisma/seed.ts
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminPassword = await argon2.hash('admin12345!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rigbuilder.gg' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@rigbuilder.gg',
      passwordHash: adminPassword,
      role: 'ADMIN',
      bio: 'RigBuilder platform admin',
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ── Sample products ─────────────────────────────────────────────────────

  const products = [
    {
      name: 'Fanatec CSL DD (8 Nm)',
      slug: 'fanatec-csl-dd-8nm',
      manufacturer: 'Fanatec',
      category: 'WHEELBASE' as const,
      subcategory: 'DIRECT_DRIVE' as const,
      platforms: ['PC' as const, 'PLAYSTATION' as const, 'XBOX' as const],
      specs: {
        driveType: 'direct_drive',
        peakTorque: 8,
        sustainedTorque: 5,
        rotationRange: 1080,
        qrType: 'fanatec_qr1',
        connectivity: ['usb'],
        psuIncluded: true,
        psuVoltage: 48,
        mountingPattern: '4_bolt_66mm',
      },
      affiliateLinks: [
        { retailer: 'Fanatec', url: 'https://fanatec.com/csl-dd', price: 349.95 },
      ],
      images: [],
    },
    {
      name: 'Simucube 2 Pro',
      slug: 'simucube-2-pro',
      manufacturer: 'Simucube',
      category: 'WHEELBASE' as const,
      subcategory: 'DIRECT_DRIVE' as const,
      platforms: ['PC' as const],
      specs: {
        driveType: 'direct_drive',
        peakTorque: 25,
        sustainedTorque: 17,
        rotationRange: 1080,
        qrType: 'simucube_2',
        connectivity: ['usb'],
        psuIncluded: true,
        psuVoltage: 48,
        mountingPattern: '4_bolt_100mm',
      },
      affiliateLinks: [
        { retailer: 'SimRacingBay', url: 'https://simracingbay.com/sc2-pro', price: 1299.00 },
      ],
      images: [],
    },
    {
      name: 'Heusinkveld Sprint Pedals',
      slug: 'heusinkveld-sprint',
      manufacturer: 'Heusinkveld',
      category: 'PEDALS' as const,
      subcategory: 'LOAD_CELL' as const,
      platforms: ['PC' as const],
      specs: {
        pedalCount: 3,
        brakeType: 'load_cell',
        maxBrakeForce: 90,
        throttleType: 'load_cell',
        clutchType: 'load_cell',
        travelDistance: 27,
        mountingPattern: 'hard_mount',
        connectivity: ['usb'],
        pedalPlateDepth: 380,
      },
      affiliateLinks: [
        { retailer: 'Heusinkveld', url: 'https://heusinkveld.com/sprint', price: 599.00 },
      ],
      images: [],
    },
    {
      name: 'Trak Racer TR160 MK5',
      slug: 'trak-racer-tr160-mk5',
      manufacturer: 'Trak Racer',
      category: 'COCKPIT' as const,
      platforms: [],
      specs: {
        material: 'Aluminium extrusion (40x80)',
        profileSize: '40x80',
        maxWheelbaseWeight: 25,
        wheelbaseMounting: ['4_bolt_66mm', '4_bolt_100mm', 'universal_slotted'],
        pedalMounting: ['hard_mount', 'universal_slotted'],
        pedalTrayDepth: 450,
        frameWidth: 520,
        seatCompatibility: ['bucket', 'gt_style'],
        isFolding: false,
        seatIncluded: false,
        weightCapacity: 130,
      },
      affiliateLinks: [
        { retailer: 'Trak Racer', url: 'https://trakracer.com/tr160', price: 649.00 },
      ],
      images: [],
    },
    {
      name: 'Samsung Odyssey G9 (2025)',
      slug: 'samsung-odyssey-g9-2025',
      manufacturer: 'Samsung',
      category: 'DISPLAY' as const,
      subcategory: 'MONITOR' as const,
      platforms: ['PC' as const],
      specs: {
        type: 'monitor',
        resolution: '5120x1440',
        refreshRate: 240,
        panelType: 'VA',
        responseTime: 1,
        screenSize: 49,
        hdrSupport: true,
        vesaMount: '100x100',
        isCurved: true,
        curveRadius: 1000,
      },
      affiliateLinks: [
        { retailer: 'Amazon UK', url: 'https://amazon.co.uk/dp/B0EXAMPLE', price: 999.99 },
      ],
      images: [],
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
    console.log(`  ✓ ${p.name}`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
