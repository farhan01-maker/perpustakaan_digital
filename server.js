// server.js - Main Server File
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/perpustakaan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],
  uploadedBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],
  readingHistory: [{
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },
    progress: {
      type: Number,
      default: 0
    },
    lastRead: {
      type: Date,
      default: Date.now
    }
  }],
  avatar: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Book Schema
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['id', 'en', 'es', 'fr', 'de', 'zh', 'ja', 'ar']
  },
  category: {
    type: String,
    required: true,
    enum: ['fiction', 'non-fiction', 'academic', 'children', 'poetry', 'biography', 'science', 'history', 'philosophy', 'folklore']
  },
  license: {
    type: String,
    enum: ['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc'],
    default: 'cc-by'
  },
  filePath: String,
  fileName: String,
  fileSize: Number,
  fileType: String,
  coverImage: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Comment Schema
const commentSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Download Schema
const downloadSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: String,
  downloadedAt: {
    type: Date,
    default: Date.now
  }
});

// Models
const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Download = mongoose.model('Download', downloadSchema);

// Middleware untuk autentikasi
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware untuk admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/books';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.epub', '.mobi', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, EPUB, MOBI, and TXT files are allowed.'));
    }
  }
});

// =================== ROUTES ===================

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// BOOK ROUTES
app.get('/api/books', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      language = '',
      category = '',
      sort = 'popular',
      status = 'approved'
    } = req.query;

    // Build query
    let query = { status };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (language) {
      query.language = language;
    }

    if (category) {
      query.category = category;
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'recent':
        sortQuery = { createdAt: -1 };
        break;
      case 'rating':
        sortQuery = { 'rating.average': -1 };
        break;
      case 'title':
        sortQuery = { title: 1 };
        break;
      case 'downloads':
        sortQuery = { downloads: -1 };
        break;
      default: // popular
        sortQuery = { views: -1, 'rating.average': -1 };
    }

    const books = await Book.find(query)
      .populate('uploadedBy', 'name')
      .sort(sortQuery)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Book.countDocuments(query);

    res.json({
      books,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Increment views
    await Book.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/books/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, author, description, language, category, license, tags } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!title || !author || !description || !language || !category) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    const book = new Book({
      title,
      author,
      description,
      language,
      category,
      license: license || 'cc-by',
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname),
      uploadedBy: req.user.userId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await book.save();

    // Add to user's uploaded books
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { uploadedBooks: book._id }
    });

    res.status(201).json({
      message: 'Book uploaded successfully',
      book
    });
  } catch (error) {
    // Clean up uploaded file if database save fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete file:', err);
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/books/:id/download', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || book.status !== 'approved') {
      return res.status(404).json({ message: 'Book not found or not approved' });
    }

    // Increment download count
    await Book.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });

    // Log download
    const download = new Download({
      bookId: req.params.id,
      userId: req.user?.userId,
      ipAddress: req.ip
    });
    await download.save();

    // Send file
    const filePath = path.resolve(book.filePath);
    if (fs.existsSync(filePath)) {
      res.download(filePath, book.fileName);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// COMMENT ROUTES
app.get('/api/books/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ bookId: req.params.id })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Comment.countDocuments({ bookId: req.params.id });

    res.json({
      comments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/books/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { comment, rating } = req.body;

    if (!comment || !rating) {
      return res.status(400).json({ message: 'Comment and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if book exists
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if user already commented
    const existingComment = await Comment.findOne({
      bookId: req.params.id,
      userId: req.user.userId
    });

    if (existingComment) {
      return res.status(400).json({ message: 'You have already commented on this book' });
    }

    const newComment = new Comment({
      bookId: req.params.id,
      userId: req.user.userId,
      comment,
      rating
    });

    await newComment.save();

    // Update book rating
    const allComments = await Comment.find({ bookId: req.params.id });
    const totalRating = allComments.reduce((sum, c) => sum + c.rating, 0);
    const averageRating = totalRating / allComments.length;

    await Book.findByIdAndUpdate(req.params.id, {
      'rating.average': averageRating,
      'rating.count': allComments.length
    });

    const populatedComment = await Comment.findById(newComment._id)
      .populate('userId', 'name avatar');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FAVORITES ROUTES
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'favorites',
        populate: {
          path: 'uploadedBy',
          select: 'name'
        }
      });

    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/books/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const bookId = req.params.id;

    const isFavorited = user.favorites.includes(bookId);

    if (isFavorited) {
      // Remove from favorites
      await User.findByIdAndUpdate(req.user.userId, {
        $pull: { favorites: bookId }
      });
      res.json({ message: 'Removed from favorites', favorited: false });
    } else {
      // Add to favorites
      await User.findByIdAndUpdate(req.user.userId, {
        $push: { favorites: bookId }
      });
      res.json({ message: 'Added to favorites', favorited: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// READING HISTORY ROUTES
app.post('/api/books/:id/reading-progress', authenticateToken, async (req, res) => {
  try {
    const { progress } = req.body;
    const bookId = req.params.id;

    await User.findOneAndUpdate(
      { _id: req.user.userId, 'readingHistory.bookId': bookId },
      {
        $set: {
          'readingHistory.$.progress': progress,
          'readingHistory.$.lastRead': new Date()
        }
      },
      { upsert: true }
    );

    // If no existing history, add new one
    const user = await User.findById(req.user.userId);
    const hasHistory = user.readingHistory.some(h => h.bookId.toString() === bookId);

    if (!hasHistory) {
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          readingHistory: {
            bookId,
            progress,
            lastRead: new Date()
          }
        }
      });
    }

    res.json({ message: 'Reading progress updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/user/reading-history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'readingHistory.bookId',
        populate: {
          path: 'uploadedBy',
          select: 'name'
        }
      });

    res.json(user.readingHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// USER PROFILE ROUTES
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('uploadedBooks')
      .populate('favorites');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user.userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email },
      { new: true, select: '-password' }
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ADMIN ROUTES
app.get('/api/admin/books', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const books = await Book.find({ status })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Book.countDocuments({ status });

    res.json({
      books,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/books/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('uploadedBy', 'name email');

    res.json({
      message: `Book ${status} successfully`,
      book
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// STATISTICS ROUTES
app.get('/api/stats', async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments({ status: 'approved' });
    const totalUsers = await User.countDocuments();
    const totalDownloads = await Download.countDocuments();
    
    const languageStats = await Book.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoryStats = await Book.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentBooks = await Book.find({ status: 'approved' })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const popularBooks = await Book.find({ status: 'approved' })
      .populate('uploadedBy', 'name')
      .sort({ downloads: -1, views: -1 })
      .limit(5);

    res.json({
      overview: {
        totalBooks,
        totalUsers,
        totalDownloads,
        totalLanguages: languageStats.length
      },
      languageStats,
      categoryStats,
      recentBooks,
      popularBooks
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SEARCH SUGGESTIONS
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const suggestions = await Book.find({
      status: 'approved',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } }
      ]
    })
    .select('title author')
    .limit(5);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
    }
  }
  
  res.status(500).json({ message: 'Something went wrong!', error: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Perpustakaan Dunia Backend API is ready!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;