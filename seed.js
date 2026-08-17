require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const Order = require('./models/Order');

const seedDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Shop.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);
    console.log('Existing collections cleared.');

    console.log('Creating demo users...');
    // Create Users
    // 1. Admin
    const admin = await User.create({
      name: 'Admin Manager',
      email: 'admin@gmail.com',
      password: 'password123',
      role: 'admin',
      addresses: [
        {
          address1: '100 Central Admin Plaza',
          address2: 'Suite 900',
          city: 'San Francisco',
          zipCode: '94105',
          country: 'United States',
          addressType: 'Office',
        },
      ],
    });

    // 2. Sellers
    const seller1 = await User.create({
      name: 'Alex Vance (TechZone)',
      email: 'seller1@gmail.com',
      password: 'password123',
      role: 'seller',
      addresses: [
        {
          address1: '404 Silicon Way',
          city: 'San Jose',
          zipCode: '95112',
          country: 'United States',
          addressType: 'Business',
        },
      ],
    });

    const seller2 = await User.create({
      name: 'Elena Rostova (Urban Trends)',
      email: 'seller2@gmail.com',
      password: 'password123',
      role: 'seller',
      addresses: [
        {
          address1: '74 Fashion Avenue',
          city: 'New York',
          zipCode: '10012',
          country: 'United States',
          addressType: 'Business',
        },
      ],
    });

    const seller3 = await User.create({
      name: 'Oliver Green (Pure Organics)',
      email: 'seller3@gmail.com',
      password: 'password123',
      role: 'seller',
      addresses: [
        {
          address1: '12 Greenway Road',
          city: 'Portland',
          zipCode: '97201',
          country: 'United States',
          addressType: 'Business',
        },
      ],
    });

    // 3. Buyers
    const buyer1 = await User.create({
      name: 'John Doe',
      email: 'buyer@gmail.com',
      password: 'password123',
      role: 'buyer',
      addresses: [
        {
          address1: '742 Evergreen Terrace',
          address2: 'Apt 2B',
          city: 'Springfield',
          zipCode: '97477',
          country: 'United States',
          addressType: 'Home',
        },
        {
          address1: '500 Tech Hub Blvd',
          city: 'Seattle',
          zipCode: '98101',
          country: 'United States',
          addressType: 'Office',
        },
      ],
    });

    const buyer2 = await User.create({
      name: 'Sarah Smith',
      email: 'user@gmail.com',
      password: 'password123',
      role: 'buyer',
      addresses: [
        {
          address1: '221B Baker Street',
          city: 'London',
          zipCode: 'NW1 6XE',
          country: 'United Kingdom',
          addressType: 'Home',
        },
      ],
    });

    console.log('Users created.');

    console.log('Creating demo shops...');
    // Create Shops
    const shop1 = await Shop.create({
      name: 'TechZone Official',
      description: 'Your premier shop for flagship laptops, smartphones, high-fidelity audio, and pro gaming gear.',
      address: 'Suite 404, Tech Park Boulevard, Silicon Bay, CA',
      logoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500&auto=format&fit=crop&q=80',
      owner: seller1._id,
      ratings: 4.9,
      isVerified: true,
    });
    await User.findByIdAndUpdate(seller1._id, { shop: shop1._id });

    const shop2 = await Shop.create({
      name: 'Urban Trends Apparel',
      description: 'Contemporary streetwear, minimal luxury fashion, premium outerwear, and designer accessories.',
      address: '74 Fashion Avenue, Soho District, New York, NY',
      logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80',
      owner: seller2._id,
      ratings: 4.8,
      isVerified: true,
    });
    await User.findByIdAndUpdate(seller2._id, { shop: shop2._id });

    const shop3 = await Shop.create({
      name: 'Pure Organics & Home',
      description: 'Eco-friendly home essentials, handcrafted ceramics, natural skincare, and artisanal wellness goods.',
      address: '12 Greenway Road, Highland Park, Portland, OR',
      logoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=80',
      owner: seller3._id,
      ratings: 4.7,
      isVerified: true,
    });
    await User.findByIdAndUpdate(seller3._id, { shop: shop3._id });

    console.log('Shops created.');

    console.log('Creating demo products...');
    const productsData = [
      // --- Shop 1: TechZone Official ---
      {
        name: 'Apple MacBook Pro 16" M3 Max',
        description: 'Blazing fast Apple M3 Max chip with 36GB unified memory, 1TB SSD storage, Liquid Retina XDR display, and all-day battery life.',
        category: 'Electronics',
        tags: ['apple', 'laptop', 'macbook', 'm3', 'pro'],
        originalPrice: 2899,
        discountPrice: 2499,
        stock: 14,
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop1._id,
        soldOut: 12,
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 5,
            comment: 'Incredible performance and battery life. Perfect workstation!',
          },
          {
            user: buyer2._id,
            name: buyer2.name,
            rating: 5,
            comment: 'The display is gorgeous and compilation speed is unmatched.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Sony WH-1000XM5 Wireless Headphones',
        description: 'Industry-leading noise canceling with Auto NC Optimizer, crystal clear hands-free calling with 4 beamforming microphones, and 30-hr battery.',
        category: 'Electronics',
        tags: ['sony', 'audio', 'headphones', 'wireless', 'anc'],
        originalPrice: 399,
        discountPrice: 329,
        stock: 25,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop1._id,
        soldOut: 18,
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 5,
            comment: 'Best noise cancellation on the market. Super comfortable on long flights.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Samsung Galaxy S24 Ultra 512GB Titanium',
        description: 'Galaxy AI is here. 200MP camera with revolutionary Nightography, Snapdragon 8 Gen 3, integrated S-Pen, and Titanium durability.',
        category: 'Electronics',
        tags: ['samsung', 'smartphone', 'galaxy', 'android', '5g'],
        originalPrice: 1399,
        discountPrice: 1199,
        stock: 19,
        images: [
          'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop1._id,
        soldOut: 9,
        reviews: [
          {
            user: buyer2._id,
            name: buyer2.name,
            rating: 5,
            comment: 'The zoom camera and screen anti-reflective coating are top tier.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Logitech MX Master 3S Wireless Mouse',
        description: 'Quiet clicks and 8,000 DPI track-on-glass sensor. Ergonomic silhouette with customizable gesture thumb buttons.',
        category: 'Electronics',
        tags: ['logitech', 'mouse', 'ergonomic', 'bluetooth', 'productivity'],
        originalPrice: 119,
        discountPrice: 99,
        stock: 45,
        images: [
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop1._id,
        soldOut: 30,
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 4,
            comment: 'Great ergonomic design, my wrist fatigue is completely gone.',
          },
        ],
        ratings: 4.0,
        isActive: true,
      },
      {
        name: 'Keychron Q1 Pro Wireless Mechanical Keyboard',
        description: 'Full aluminum body, hot-swappable switches, double-gasket design, and QMK/VIA programmable RGB lighting.',
        category: 'Electronics',
        tags: ['keyboard', 'gaming', 'mechanical', 'rgb', 'keychron'],
        originalPrice: 219,
        discountPrice: 189,
        stock: 20,
        images: [
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop1._id,
        soldOut: 15,
        reviews: [],
        ratings: 4.8,
        isActive: true,
      },

      // --- Shop 2: Urban Trends Apparel ---
      {
        name: 'Minimalist Heavyweight Cotton Hoodie',
        description: 'Crafted from 480 GSM organic french terry cotton. Boxy modern drape with double-lined hood and zero drawstring clutter.',
        category: 'Fashion',
        tags: ['hoodie', 'streetwear', 'cotton', 'oversized', 'minimal'],
        originalPrice: 95,
        discountPrice: 68,
        stock: 55,
        images: [
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop2._id,
        soldOut: 42,
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 5,
            comment: 'The quality of the fabric is exceptional. Super heavy and warm.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Classic Vintage Wash Denim Jacket',
        description: 'Authentic 14oz Japanese selvedge denim with antique brass hardware and timeless relaxed fit.',
        category: 'Fashion',
        tags: ['denim', 'jacket', 'vintage', 'outerwear', 'selvedge'],
        originalPrice: 150,
        discountPrice: 110,
        stock: 28,
        images: [
          'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop2._id,
        soldOut: 20,
        reviews: [
          {
            user: buyer2._id,
            name: buyer2.name,
            rating: 5,
            comment: 'Fits true to size and the wash looks even better in person.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Heritage Leather Chronograph Watch',
        description: 'Sapphire crystal glass, Japanese quartz movement, genuine Italian calfskin leather strap with quick-release spring bars.',
        category: 'Fashion',
        tags: ['watch', 'leather', 'accessories', 'luxury', 'chronograph'],
        originalPrice: 280,
        discountPrice: 195,
        stock: 15,
        images: [
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop2._id,
        soldOut: 11,
        reviews: [],
        ratings: 4.9,
        isActive: true,
      },
      {
        name: 'Retro Monochrome High-Top Sneakers',
        description: 'Premium full-grain leather upper with cushioned EVA midsole and vulcanized rubber traction outsole.',
        category: 'Fashion',
        tags: ['sneakers', 'shoes', 'footwear', 'streetwear', 'leather'],
        originalPrice: 180,
        discountPrice: 139,
        stock: 22,
        images: [
          'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop2._id,
        soldOut: 19,
        reviews: [],
        ratings: 4.7,
        isActive: true,
      },
      {
        name: 'Matte Black Polarized Sunglasses',
        description: 'Lightweight titanium-reinforced acetate frame with Category 3 UV400 polarized scratch-resistant lenses.',
        category: 'Fashion',
        tags: ['sunglasses', 'eyewear', 'accessories', 'polarized'],
        originalPrice: 85,
        discountPrice: 59,
        stock: 40,
        images: [
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop2._id,
        soldOut: 25,
        reviews: [],
        ratings: 4.6,
        isActive: true,
      },

      // --- Shop 3: Pure Organics & Home ---
      {
        name: 'Handcrafted Ceramic Dinnerware Set (16-Piece)',
        description: 'Stoneware ceramics with organic speckled glaze. Microwave, oven, and dishwasher safe. Includes dinner plates, salad plates, bowls, and mugs.',
        category: 'Home & Living',
        tags: ['ceramics', 'kitchen', 'dinnerware', 'handmade', 'artisan'],
        originalPrice: 140,
        discountPrice: 99,
        stock: 18,
        images: [
          'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop3._id,
        soldOut: 14,
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 5,
            comment: 'Gorgeous tableware! Elevated our dining experience completely.',
          },
        ],
        ratings: 5.0,
        isActive: true,
      },
      {
        name: 'Organic Soy Wax Aromatherapy Candle',
        description: 'Hand-poured 100% natural soy wax candle infused with lavender, sandalwood, and bergamot essential oils. 55-hour clean burn.',
        category: 'Home & Living',
        tags: ['candle', 'aromatherapy', 'organic', 'essential-oils', 'relaxation'],
        originalPrice: 38,
        discountPrice: 28,
        stock: 65,
        images: [
          'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop3._id,
        soldOut: 38,
        reviews: [],
        ratings: 4.8,
        isActive: true,
      },
      {
        name: 'Botanical Hydrating Vitamin C Facial Serum',
        description: 'Plant-derived hyaluronic acid, 15% stable Vitamin C, and rosehip oil for vibrant, glowing, and nourished skin.',
        category: 'Wellness',
        tags: ['skincare', 'serum', 'organic', 'vitamin-c', 'beauty'],
        originalPrice: 65,
        discountPrice: 48,
        stock: 35,
        images: [
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop3._id,
        soldOut: 22,
        reviews: [],
        ratings: 4.9,
        isActive: true,
      },
      {
        name: 'Natural Bamboo Cutting & Charcuterie Board',
        description: 'Eco-friendly sustainable organic bamboo with deep juice drip groove and built-in side handles for easy serving.',
        category: 'Home & Living',
        tags: ['bamboo', 'kitchen', 'cooking', 'charcuterie', 'organic'],
        originalPrice: 45,
        discountPrice: 34,
        stock: 30,
        images: [
          'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&auto=format&fit=crop&q=80',
        ],
        shop: shop3._id,
        soldOut: 16,
        reviews: [],
        ratings: 4.7,
        isActive: true,
      },
    ];

    const createdProducts = await Product.insertMany(productsData);
    console.log(`Created ${createdProducts.length} demo products.`);

    console.log('Creating demo orders...');
    // Create demo orders for buyer1 (John Doe)
    // Order 1: Delivered multi-vendor checkout split
    const checkoutGroup1 = `chk_demo_${Date.now()}_1`;
    const order1Shop1 = await Order.create({
      checkoutGroupId: checkoutGroup1,
      buyer: buyer1._id,
      shop: shop1._id,
      items: [
        {
          product: createdProducts[0]._id, // MacBook Pro
          name: createdProducts[0].name,
          image: createdProducts[0].images[0],
          quantity: 1,
          price: createdProducts[0].discountPrice,
        },
        {
          product: createdProducts[1]._id, // Sony Headphones
          name: createdProducts[1].name,
          image: createdProducts[1].images[0],
          quantity: 1,
          price: createdProducts[1].discountPrice,
        },
      ],
      shippingAddress: {
        address1: buyer1.addresses[0].address1,
        address2: buyer1.addresses[0].address2,
        city: buyer1.addresses[0].city,
        zipCode: buyer1.addresses[0].zipCode,
        country: buyer1.addresses[0].country,
      },
      itemsPrice: createdProducts[0].discountPrice + createdProducts[1].discountPrice,
      shippingPrice: 0,
      totalPrice: createdProducts[0].discountPrice + createdProducts[1].discountPrice,
      status: 'Delivered',
      paymentInfo: {
        method: 'Card',
        status: 'Paid',
        stripeSessionId: 'cs_test_demo_session_101',
      },
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const order1Shop2 = await Order.create({
      checkoutGroupId: checkoutGroup1,
      buyer: buyer1._id,
      shop: shop2._id,
      items: [
        {
          product: createdProducts[5]._id, // Hoodie
          name: createdProducts[5].name,
          image: createdProducts[5].images[0],
          quantity: 2,
          price: createdProducts[5].discountPrice,
        },
      ],
      shippingAddress: {
        address1: buyer1.addresses[0].address1,
        address2: buyer1.addresses[0].address2,
        city: buyer1.addresses[0].city,
        zipCode: buyer1.addresses[0].zipCode,
        country: buyer1.addresses[0].country,
      },
      itemsPrice: createdProducts[5].discountPrice * 2,
      shippingPrice: 0,
      totalPrice: createdProducts[5].discountPrice * 2,
      status: 'Delivered',
      paymentInfo: {
        method: 'Card',
        status: 'Paid',
        stripeSessionId: 'cs_test_demo_session_101',
      },
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // Order 2: Shipped Order from Pure Organics
    const checkoutGroup2 = `chk_demo_${Date.now()}_2`;
    const order2Shop3 = await Order.create({
      checkoutGroupId: checkoutGroup2,
      buyer: buyer1._id,
      shop: shop3._id,
      items: [
        {
          product: createdProducts[10]._id, // Ceramic Set
          name: createdProducts[10].name,
          image: createdProducts[10].images[0],
          quantity: 1,
          price: createdProducts[10].discountPrice,
        },
        {
          product: createdProducts[11]._id, // Soy Candle
          name: createdProducts[11].name,
          image: createdProducts[11].images[0],
          quantity: 2,
          price: createdProducts[11].discountPrice,
        },
      ],
      shippingAddress: {
        address1: buyer1.addresses[0].address1,
        city: buyer1.addresses[0].city,
        zipCode: buyer1.addresses[0].zipCode,
        country: buyer1.addresses[0].country,
      },
      itemsPrice: createdProducts[10].discountPrice + createdProducts[11].discountPrice * 2,
      shippingPrice: 0,
      totalPrice: createdProducts[10].discountPrice + createdProducts[11].discountPrice * 2,
      status: 'Shipped',
      paymentInfo: {
        method: 'Card',
        status: 'Paid',
        stripeSessionId: 'cs_test_demo_session_202',
      },
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    // Order 3: Processing Order (Cash On Delivery)
    const checkoutGroup3 = `chk_demo_${Date.now()}_3`;
    const order3Shop1 = await Order.create({
      checkoutGroupId: checkoutGroup3,
      buyer: buyer1._id,
      shop: shop1._id,
      items: [
        {
          product: createdProducts[3]._id, // Logitech Mouse
          name: createdProducts[3].name,
          image: createdProducts[3].images[0],
          quantity: 1,
          price: createdProducts[3].discountPrice,
        },
      ],
      shippingAddress: {
        address1: buyer1.addresses[1].address1,
        city: buyer1.addresses[1].city,
        zipCode: buyer1.addresses[1].zipCode,
        country: buyer1.addresses[1].country,
      },
      itemsPrice: createdProducts[3].discountPrice,
      shippingPrice: 0,
      totalPrice: createdProducts[3].discountPrice,
      status: 'Processing',
      paymentInfo: {
        method: 'Cash On Delivery',
        status: 'Not Paid',
      },
    });

    console.log('Demo orders created.');

    console.log('\n===========================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================');
    console.log('Demo Accounts:');
    console.log('  👑 Admin:  admin@gmail.com   / password123');
    console.log('  🏪 Seller1: seller1@gmail.com / password123 (TechZone Official)');
    console.log('  🏪 Seller2: seller2@gmail.com / password123 (Urban Trends)');
    console.log('  🏪 Seller3: seller3@gmail.com / password123 (Pure Organics)');
    console.log('  🛒 Buyer1:  buyer@gmail.com   / password123 (John Doe - with orders & addresses)');
    console.log('  🛒 Buyer2:  user@gmail.com    / password123 (Sarah Smith)');
    console.log('===========================================\n');

    return {
      usersCount: 6,
      shopsCount: 3,
      productsCount: createdProducts.length,
      ordersCount: 4,
    };
  } catch (err) {
    console.error('❌ Error during database seed:', err);
    throw err;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = seedDatabase;
