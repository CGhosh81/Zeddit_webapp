import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

// In-memory storage
const users = [];
const posts = [];
let userId = 1;
let postId = 1;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: userId++,
    username,
    password: hashedPassword
  };
  
  users.push(user);
  res.status(201).json({ message: 'User created successfully' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Posts routes
app.get('/api/posts', (req, res) => {
  const formattedPosts = posts.map(post => ({
    ...post,
    votes: post.votes.reduce((sum, vote) => sum + vote.value, 0),
    userVote: 0
  }));

  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      formattedPosts.forEach(post => {
        const userVote = post.votes.find(vote => vote.userId === decoded.id);
        post.userVote = userVote ? userVote.value : 0;
      });
    } catch (error) {
      // Invalid token, continue without user votes
    }
  }

  res.json(formattedPosts);
});

app.post('/api/posts', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  const post = {
    id: postId++,
    title,
    content,
    userId: req.user.id,
    username: req.user.username,
    createdAt: new Date().toISOString(),
    votes: []
  };
  
  posts.push(post);
  res.status(201).json(post);
});

app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  const postIndex = posts.findIndex(p => p.id === parseInt(req.params.id));
  
  if (postIndex === -1) {
    return res.status(404).json({ message: 'Post not found' });
  }
  
  if (posts[postIndex].userId !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  posts.splice(postIndex, 1);
  res.json({ message: 'Post deleted successfully' });
});

app.post('/api/posts/:id/vote', authenticateToken, (req, res) => {
  const { voteType } = req.body;
  const post = posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const voteValue = voteType === 'up' ? 1 : -1;
  const existingVote = post.votes.findIndex(v => v.userId === req.user.id);

  if (existingVote !== -1) {
    post.votes[existingVote].value = voteValue;
  } else {
    post.votes.push({ userId: req.user.id, value: voteValue });
  }

  res.json({ message: 'Vote recorded' });
});

// Initialize Vite in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa'
});

app.use(vite.middlewares);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});