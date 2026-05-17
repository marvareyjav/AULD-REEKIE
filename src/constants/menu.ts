export const CATEGORIES = ['All', 'Coffee', 'Snack', 'Pastries', 'Special Beverage', 'Best Seller', 'New Menu', 'Combo'];

export const MENU_ITEMS = [
  // COFFEE
  { id: 1, name: 'Espresso Single', price: 18000, category: 'Coffee', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=600' },
  { id: 2, name: 'Americano Ice', price: 15000, category: 'Coffee', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&q=80&w=600' },
  { id: 3, name: 'Cappuccino Brulée', price: 27000, category: 'Coffee', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600' },
  { id: 4, name: 'Latte Vanilla', price: 30000, category: 'Coffee', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1536964541075-e392f44c546f?auto=format&fit=crop&q=80&w=600' },
  { id: 5, name: 'Latte Caramel', price: 30000, category: 'Coffee', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600' },
  { id: 6, name: 'Latte Hazelnut', price: 30000, category: 'Coffee', img: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&q=80&w=600' },
  { id: 7, name: 'Mochaccino Velvet', price: 33000, category: 'Coffee', img: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&q=80&w=600' },
  { id: 8, name: 'Traditional Iced Coffee', price: 22500, category: 'Coffee', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600' },
  { id: 9, name: 'Affogato Fancy', price: 37500, category: 'Coffee', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1594631252845-29fc4586d5d7?auto=format&fit=crop&q=80&w=600' },

  // SNACK
  { id: 10, name: 'Original French Fries', price: 18000, category: 'Snack', img: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&q=80&w=600' },
  { id: 11, name: 'BBQ Chicken Wings', price: 37500, category: 'Snack', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&q=80&w=600' },
  { id: 12, name: 'Golden Chicken Nuggets', price: 27000, category: 'Snack', img: 'https://images.unsplash.com/photo-1562967962-e1c5520a2322?auto=format&fit=crop&q=80&w=600' },
  { id: 13, name: 'Crunchy Onion Rings', price: 22500, category: 'Snack', img: 'https://images.unsplash.com/photo-1639024471283-035188801981?auto=format&fit=crop&q=80&w=600' },
  { id: 14, name: 'Smokey Sausage Grill', price: 30000, category: 'Snack', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1532197197604-da332fb64b4c?auto=format&fit=crop&q=80&w=600' },
  { id: 15, name: 'Buttery Garlic Bread', price: 22500, category: 'Snack', img: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&q=80&w=600' },

  // PASTRIES
  { id: 16, name: 'Butter Croissant', price: 22500, category: 'Pastries', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600' },
  { id: 17, name: 'Chocolate Croissant', price: 27000, category: 'Pastries', img: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&q=80&w=600' },
  { id: 18, name: 'Donut Glazed', price: 12000, category: 'Pastries', img: 'https://images.unsplash.com/photo-1527324688101-016748a548bb?auto=format&fit=crop&q=80&w=600' },
  { id: 19, name: 'Donut Matcha', price: 12000, category: 'Pastries', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1618511674097-6a1353f8863c?auto=format&fit=crop&q=80&w=600' },
  { id: 20, name: 'Blueberry Muffin', price: 18000, category: 'Pastries', img: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600' },
  { id: 21, name: 'Classic Brownies', price: 22500, category: 'Pastries', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1606312619070-d48b4c6e2a52?auto=format&fit=crop&q=80&w=600' },
  { id: 22, name: 'New York Cheesecake', price: 45000, category: 'Pastries', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=600' },
  { id: 23, name: 'Cinnamon Swirl Roll', price: 22500, category: 'Pastries', img: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&q=80&w=600' },

  // SPECIAL BEVERAGE
  { id: 24, name: 'Matcha Latte', price: 37500, category: 'Special Beverage', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1536496070240-dac43ca9bc81?auto=format&fit=crop&q=80&w=600' },
  { id: 25, name: 'Thai Tea Special', price: 22500, category: 'Special Beverage', img: 'https://images.unsplash.com/photo-1533166548773-455427181fbd?auto=format&fit=crop&q=80&w=600' },
  { id: 26, name: 'Milk Tea Boba', price: 30000, category: 'Special Beverage', tag: 'Best Seller', img: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?auto=format&fit=crop&q=80&w=600' },
  { id: 27, name: 'Premium Chocolate Drink', price: 27000, category: 'Special Beverage', img: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&q=80&w=600' },
  { id: 28, name: 'Mango Smoothies', price: 37500, category: 'Special Beverage', img: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?auto=format&fit=crop&q=80&w=600' },
  { id: 29, name: 'Avocado Smoothies', price: 37500, category: 'Special Beverage', tag: 'New Menu', img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600' },
  { id: 30, name: 'Sparkling Lemon Soda', price: 22500, category: 'Special Beverage', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600' },

  // COMBOS
  { id: 101, name: 'Coffee & Croissant Combo', price: 37500, category: 'Coffee', tag: 'Combo', img: 'https://images.unsplash.com/photo-1517701550927-30cf4abb1dba?auto=format&fit=crop&q=80&w=600' },
  { id: 102, name: 'Sweet Morning Combo', price: 52500, category: 'Pastries', tag: 'Combo', img: 'https://images.unsplash.com/photo-1511920170033-f83969a4c348?auto=format&fit=crop&q=80&w=600' },
];
