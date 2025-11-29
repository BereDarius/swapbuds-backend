import {
  DeliveryMethod,
  DeliveryScope,
  ItemCategory,
  ItemCondition,
  ItemStatus,
  PrismaClient,
  User,
} from '@prisma/client';

/**
 * Seed items for testing
 */
export async function seedItems(prisma: PrismaClient, users: User[]) {
  console.log('📦 Seeding items...');

  const regularUsers = users.filter((u) => u.role === 'USER');

  if (regularUsers.length === 0) {
    console.log('   ⚠️  No regular users found, skipping items seed');
    return [];
  }

  const itemsData = [
    // John Doe's items (Electronics & Gaming)
    {
      userId: regularUsers[0].id,
      title: 'Sony PlayStation 4 Pro',
      description:
        'PS4 Pro in excellent condition, 1TB storage. Comes with 2 controllers and charging dock. Used lightly, no scratches.',
      condition: ItemCondition.EXCELLENT,
      category: ItemCategory.ELECTRONICS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 250.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3',
          publicId: 'seed_ps4_pro_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[0].id,
      title: 'Nintendo Switch OLED',
      description:
        'Like-new Nintendo Switch OLED model with vibrant screen. Includes dock, Joy-Cons, and original packaging. Perfect condition!',
      condition: ItemCondition.LIKE_NEW,
      category: ItemCategory.ELECTRONICS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 320.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.INTERNATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e',
          publicId: 'seed_switch_oled_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[0].id,
      title: 'Retro Game Boy Color Collection',
      description:
        'Collection of 3 Game Boy Color consoles (purple, yellow, teal) all in working condition. Great for collectors!',
      condition: ItemCondition.GOOD,
      category: ItemCategory.COLLECTIBLES,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 180.0,
      deliveryMethods: [DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd',
          publicId: 'seed_gameboy_collection_1',
          order: 0,
        },
      ],
    },

    // Jane Smith's items (Books & Vinyl)
    {
      userId: regularUsers[1].id,
      title: 'Harry Potter Complete Book Set',
      description:
        'Complete Harry Potter series in English, hardcover editions. All 7 books in excellent condition with dust jackets.',
      condition: ItemCondition.EXCELLENT,
      category: ItemCategory.BOOKS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 120.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf',
          publicId: 'seed_harry_potter_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[1].id,
      title: 'Vinyl Record Collection - Classic Rock',
      description:
        'Collection of 15 classic rock vinyl records including Pink Floyd, Led Zeppelin, and The Beatles. All in good playable condition.',
      condition: ItemCondition.GOOD,
      category: ItemCategory.COLLECTIBLES,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 200.0,
      deliveryMethods: [DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.INTERNATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1512288911187-76c44ccbea65',
          publicId: 'seed_vinyl_collection_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[1].id,
      title: 'Lord of the Rings Trilogy - Illustrated Edition',
      description:
        'Beautifully illustrated edition of LOTR trilogy. Large format, hardcover with Alan Lee illustrations. Coffee table worthy!',
      condition: ItemCondition.LIKE_NEW,
      category: ItemCategory.BOOKS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 95.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
          publicId: 'seed_lotr_1',
          order: 0,
        },
      ],
    },

    // Alex Trader's items (Sports & Collectibles)
    {
      userId: regularUsers[2].id,
      title: 'Professional Tennis Racket - Wilson Pro Staff',
      description:
        'Wilson Pro Staff RF97 tennis racket. Used for one season, still in great shape. Perfect for intermediate to advanced players.',
      condition: ItemCondition.GOOD,
      category: ItemCategory.SPORTS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 140.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6',
          publicId: 'seed_tennis_racket_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[2].id,
      title: 'Signed Football Jersey - Gheorghe Hagi',
      description:
        'Authentic signed jersey of Romanian football legend Gheorghe Hagi. Comes with certificate of authenticity. Rare collectible!',
      condition: ItemCondition.EXCELLENT,
      category: ItemCategory.COLLECTIBLES,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 450.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.INTERNATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1522778526097-ce0a22ceb253',
          publicId: 'seed_hagi_jersey_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[2].id,
      title: 'Mountain Bike - Trek Marlin 7',
      description:
        'Trek Marlin 7 mountain bike, 29" wheels, medium frame. Well maintained, recent tune-up. Great for trails and commuting.',
      condition: ItemCondition.GOOD,
      category: ItemCategory.SPORTS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 380.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91',
          publicId: 'seed_mountain_bike_1',
          order: 0,
        },
      ],
    },

    // Maria Garcia's items (Fashion & Home)
    {
      userId: regularUsers[3].id,
      title: 'Designer Handbag - Michael Kors',
      description:
        'Authentic Michael Kors crossbody bag in burgundy. Gently used, some minor wear but still looks great. Comes with dust bag.',
      condition: ItemCondition.GOOD,
      category: ItemCategory.CLOTHING,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 85.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
          publicId: 'seed_handbag_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[3].id,
      title: 'Vintage Ceramic Vase Set',
      description:
        'Set of 3 vintage ceramic vases in blues and greens. Perfect for home decoration. Mid-century modern style.',
      condition: ItemCondition.EXCELLENT,
      category: ItemCategory.HOME,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 60.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d',
          publicId: 'seed_vases_1',
          order: 0,
        },
      ],
    },

    // Mike Collector's items (Collectibles & Toys)
    {
      userId: regularUsers[4].id,
      title: 'Marvel Legends Action Figure Collection',
      description:
        'Collection of 10 Marvel Legends action figures. All mint in box (MIB). Includes Iron Man, Spider-Man, Captain America variants.',
      condition: ItemCondition.NEW,
      category: ItemCategory.TOYS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 280.0,
      deliveryMethods: [DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.INTERNATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622',
          publicId: 'seed_marvel_figures_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[4].id,
      title: 'Vintage Star Wars Comics - Complete Run',
      description:
        'Complete run of original Marvel Star Wars comics #1-107 (1977-1986). All bagged and boarded. Some issues in excellent condition.',
      condition: ItemCondition.GOOD,
      category: ItemCategory.COLLECTIBLES,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 550.0,
      deliveryMethods: [DeliveryMethod.MAIL],
      deliveryScope: DeliveryScope.INTERNATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe',
          publicId: 'seed_star_wars_comics_1',
          order: 0,
        },
      ],
    },
    {
      userId: regularUsers[4].id,
      title: 'LEGO Star Wars UCS Millennium Falcon',
      description:
        'Ultimate Collector Series Millennium Falcon (75192). Complete, built once, displayed only. Comes with all minifigures and instructions.',
      condition: ItemCondition.LIKE_NEW,
      category: ItemCategory.TOYS,
      status: ItemStatus.AVAILABLE,
      estimatedValue: 780.0,
      deliveryMethods: [DeliveryMethod.PHYSICAL],
      deliveryScope: DeliveryScope.NATIONAL,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b',
          publicId: 'seed_lego_falcon_1',
          order: 0,
        },
      ],
    },
  ];

  const createdItems = [];

  for (const itemData of itemsData) {
    const { images, ...itemWithoutImages } = itemData;

    const item = await prisma.item.create({
      data: {
        ...itemWithoutImages,
        images: {
          create: images,
        },
      },
      include: {
        images: true,
      },
    });

    console.log(`   ✅ Created item: ${item.title}`);
    createdItems.push(item);
  }

  console.log(`✅ Seeded ${createdItems.length} items`);
  return createdItems;
}
