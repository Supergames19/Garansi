const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure backup directory exists
const DATA_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// POST: Backup Data
app.use('/api/backup', (req, res) => {
    const { userId, products, date } = req.body;

    if (!userId || !products) {
        return res.status(400).json({ error: 'Missing userId or products' });
    }

    const filePath = path.join(DATA_DIR, `${userId}.json`);
    const backupData = {
        lastUpdated: date,
        products: products
    };

    fs.writeFile(filePath, JSON.stringify(backupData, null, 2), (err) => {
        if (err) {
            console.error('Error saving backup:', err);
            return res.status(500).json({ error: 'Failed to save backup' });
        }
        console.log(`Backup saved for user: ${userId}`);
        res.status(200).json({ message: 'Backup successful' });
    });
});

// GET: Restore Data
app.get('/api/restore/:userId', (req, res) => {
    const userId = req.params.userId;
    const filePath = path.join(DATA_DIR, `${userId}.json`);

    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading backup:', err);
                return res.status(500).json({ error: 'Failed to read backup' });
            }
            const parsedData = JSON.parse(data);
            res.status(200).json(parsedData);
        });
    } else {
        res.status(404).json({ error: 'No backup found for this user' });
    }
});

app.listen(PORT, () => {
    console.log(`WarrantyGuard Server running on http://localhost:${PORT}`);
    console.log(`Backup directory: ${DATA_DIR}`);
});