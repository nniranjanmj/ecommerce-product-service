const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json());

// MySQL connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ecommerce',
  port: process.env.DB_PORT || 3306
};

let db;

// Initialize database
async function initDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Product Service: Database connected');
  } catch (error) {
    console.error('Product Service: Database connection failed:', error);
  }
}

initDB();

// Mock products (fallback)
let products = [
  { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
  { id: 2, name: 'Phone', price: 699.99, category: 'Electronics', stock: 100 },
  { id: 3, name: 'Book', price: 19.99, category: 'Books', stock: 200 }
];

app.get('/', async (req, res) => {
  const { category, search } = req.query;
  
  try {
    if (db) {
      let query = 'SELECT * FROM products WHERE 1=1';
      let params = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
      }
      
      const [rows] = await db.execute(query, params);
      res.json(rows);
    } else {
      // Fallback to mock data
      let filtered = products;
      if (category) filtered = filtered.filter(p => p.category === category);
      if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      res.json(filtered);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/:id', async (req, res) => {
  try {
    if (db) {
      const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(rows[0]);
    } else {
      const product = products.find(p => p.id === parseInt(req.params.id));
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/', async (req, res) => {
  const { name, price, category, stock, description } = req.body;
  
  try {
    if (db) {
      const [result] = await db.execute(
        'INSERT INTO products (name, price, category, stock, description) VALUES (?, ?, ?, ?, ?)',
        [name, price, category, stock, description || '']
      );
      res.status(201).json({ id: result.insertId, name, price, category, stock, description });
    } else {
      const product = { id: Date.now(), name, price, category, stock, description };
      products.push(product);
      res.status(201).json(product);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.listen(3002, () => console.log('Product Service running on port 3002'));