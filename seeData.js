// scripts/seedData.js - Script untuk mengisi database dengan data contoh
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models (pastikan path sesuai dengan struktur project Anda)
const User = require('../models/User');
const Book = require('../models/Book');
const Comment = require('../models/Comment');

// Sample data
const sampleUsers = [
  {
    name: 'Admin Perpustakaan',
    email: 'admin@perpustakaan.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'Ahmad Pratama',
    email: 'ahmad@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Sari Dewi',
    email: 'sari@example.com', 
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    password: 'password123',
    role: 'user'
  }
];

const sampleBooks = [
  {
    title: 'Laskar Pelangi',
    author: 'Andrea Hirata',
    description: 'Novel yang mengisahkan tentang perjuangan sepuluh anak dari keluarga miskin untuk bersekolah dan menggapai cita-cita mereka di Pulau Belitung.',
    language: 'id',
    category: 'fiction',
    license: 'cc-by',
    status: 'approved',
    tags: ['indonesia', 'inspirasi', 'pendidikan'],
    rating: { average: 4.8, count: 156 },
    downloads: 2340,
    views: 5670
  },
  {
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    description: 'Novel pertama dari Tetralogi Buru yang mengisahkan kehidupan di Hindia Belanda pada awal abad ke-20.',
    language: 'id',
    category: 'fiction',
    license: 'cc-by',
    status: 'approved',
    tags: ['sejarah', 'indonesia', 'kolonial'],
    rating: { average: 4.9, count: 234 },
    downloads: 3450,
    views: 7890
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    description: 'Ancient Chinese military treatise dating from the Late Spring and Autumn Period.',
    language: 'en',
    category: 'philosophy',
    license: 'cc0',
    status: 'approved',
    tags: ['strategy', 'philosophy', 'ancient'],
    rating: { average: 4.5, count: 189 },
    downloads: 1890,
    views: 4560
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    description: 'A romantic novel of manners written by Jane Austen in 1813.',
    language: 'en',
    category: 'fiction',
    license: 'cc0',
    status: 'approved',
    tags: ['romance', 'classic', 'british'],
    rating: { average: 4.4, count: 298 },
    downloads: 2780,
    views: 6540
  },
  {
    title: 'Don Quixote',
    author: 'Miguel de Cervantes',
    description: 'La historia del ingenioso hidalgo Don Quijote de La Mancha.',
    language: 'es',
    category: 'fiction',
    license: 'cc0',
    status: 'approved',
    tags: ['classic', 'spanish', 'adventure'],
    rating: { average: 4.2, count: 145 },
    downloads: 1560,
    views: 3420
  },
  {
    title: 'Les Misérables',
    author: 'Victor Hugo',
    description: 'Un roman historique français du 19e siècle.',
    language: 'fr',
    category: 'fiction',
    license: 'cc0',
    status: 'approved',
    tags: ['french', 'historical', 'classic'],
    rating: { average: 4.6, count: 203 },
    downloads: 2100,
    views: 4890
  },
  {
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    description: 'Die Geschichte von Siddhartha auf der Suche nach Erleuchtung.',
    language: 'de',
    category: 'philosophy',
    license: 'cc-by',
    status: 'approved',
    tags: ['philosophy', 'spirituality', 'german'],
    rating: { average: 4.4, count: 167 },
    downloads: 1340,
    views: 3210
  },
  {
    title: '三国演义',
    author: '罗贯中',
    description: '中国古典四大名著之一，描述了从东汉末年到西晋初年的历史风云。',
    language: 'zh',
    category: 'history',
    license: 'cc0',
    status: 'approved',
    tags: ['chinese', 'history', 'classic'],
    rating: { average: 4.7, count: 89 },
    downloads: 890,
    views: 2100
  },
  {
    title: '源氏物語',
    author: '紫式部',
    description: '平安時代中期に成立した日本の長編物語。',
    language: 'ja',
    category: 'fiction',
    license: 'cc0',
    status: 'approved',
    tags: ['japanese', 'classical', 'literature'],
    rating: { average: 4.3, count: 67 },
    downloads: 567,
    views: 1450
  },
  {
    title: 'ألف ليلة وليلة',
    author: 'مجهول',
    description: 'مجموعة من الحكايات الشعبية من الشرق الأوسط.',
    language: 'ar',
    category: 'folklore',
    license: 'cc0',
    status: 'approved',
    tags: ['arabic', 'folklore', 'tales'],
    rating: { average: 4.5, count: 78 },
    downloads: 456,
    views: 1230
  },
  {
    title: 'Introduction to Computer Science',
    author: 'Dr. John Smith',
    description: 'A comprehensive guide to computer science fundamentals.',
    language: 'en',
    category: 'academic',
    license: 'cc-by-sa',
    status: 'pending',
    tags: ['computer-science', 'programming', 'education'],
    rating: { average: 0, count: 0 },
    downloads: 0,
    views: 45
  },
  {
    title: 'Petualangan Si Kancil',
    author: 'Penulis Anonim',
    description: 'Kumpulan cerita rakyat Indonesia tentang kancil yang cerdik.',
    language: 'id',
    category: 'children',
    license: 'cc0',
    status: 'approved',
    tags: ['anak-anak', 'cerita-rakyat', 'indonesia'],
    rating: { average: 4.6, count: 124 },
    downloads: 1890,
    views: 3450
  }
];

const sampleComments = [
  {
    comment: 'Buku yang sangat menarik! Penjelasannya mudah dipahami dan memberikan wawasan baru.',
    rating: 5
  },
  {
    comment: 'Kualitas terjemahan sangat baik. Cocok untuk pembelajaran bahasa.',
    rating: 4
  },
  {
    comment: 'Cerita yang menginspirasi. Sangat direkomendasikan!',
    rating: 5
  },
  {
    comment: 'Classic yang tidak pernah bosan untuk dibaca ulang.',
    rating: 4
  },
  {
    comment: 'Buku ini mengubah cara pandang saya terhadap hidup.',
    rating: 5
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/perpustakaan');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Book.deleteMany({});
    await Comment.deleteMany({});

    // Create users
    console.log('Creating users...');
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`Created ${createdUsers.length} users`);

    // Create books
    console.log('Creating books...');
    const booksWithUploader = sampleBooks.map((book, index) => ({
      ...book,
      uploadedBy: createdUsers[index % createdUsers.length]._id,
      filePath: `uploads/books/sample-${book.title.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      fileName: `${book.title}.pdf`,
      fileSize: Math.floor(Math.random() * 10000000) + 1000000, // Random size between 1-10MB
      fileType: '.pdf'
    }));

    const createdBooks = await Book.insertMany(booksWithUploader);
    console.log(`Created ${createdBooks.length} books`);

    // Create comments
    console.log('Creating comments...');
    const commentsWithRefs = [];
    
    createdBooks.forEach((book, bookIndex) => {
      // Add 2-3 random comments per book
      const numComments = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numComments; i++) {
        const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
        const randomUser = createdUsers[Math.floor(Math.random() * (createdUsers.length - 1)) + 1]; // Exclude admin
        
        commentsWithRefs.push({
          ...randomComment,
          bookId: book._id,
          userId: randomUser._id,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        });
      }
    });

    await Comment.insertMany(commentsWithRefs);
    console.log(`Created ${commentsWithRefs.length} comments`);

    // Update user favorites and reading history
    console.log('Updating user favorites and reading history...');
    for (let i = 1; i < createdUsers.length; i++) { // Skip admin
      const user = createdUsers[i];
      const favoriteBooks = createdBooks.slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 favorites
      const readingHistory = createdBooks.slice(0, Math.floor(Math.random() * 5) + 2).map(book => ({
        bookId: book._id,
        progress: Math.floor(Math.random() * 100),
        lastRead: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last week
      }));

      await User.findByIdAndUpdate(user._id, {
        favorites: favoriteBooks.map(book => book._id),
        readingHistory: readingHistory
      });
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`📚 Books: ${createdBooks.length}`);
    console.log(`💬 Comments: ${commentsWithRefs.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@perpustakaan.com / admin123');
    console.log('User 1: ahmad@example.com / password123');
    console.log('User 2: sari@example.com / password123');
    console.log('User 3: budi@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;