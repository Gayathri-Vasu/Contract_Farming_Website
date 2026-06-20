# Assured Contract Farming System for Stable Market Access

A complete full-stack web application that enables assured contract farming by connecting farmers directly with buyers through transparent agreements, stable pricing, and secure payments.

## 🌾 Project Overview

This platform addresses the uncertainty farmers face in selling their produce due to fluctuating market prices and lack of guaranteed buyers. It provides:

- **Guaranteed buyers** for farmers' crops
- **Contract-based farming agreements** with digital signatures
- **Price transparency** and stable pricing
- **Secure payment processing** with advance and final payment options
- **Dispute resolution** support
- **Rating and review system** for trust building

## 🎯 Features

### For Farmers
- Register and verify profile
- List crops with quantity, quality, expected price, and harvest date
- View and manage buyer offers
- Accept/reject contracts
- Track payments and contract status
- Digital contract signing

### For Buyers (Retailers/Exporters/Companies)
- Register and verify business
- Browse available crops with filters
- Propose contract offers (price, quantity, duration)
- Digitally sign contracts
- Make secure payments (advance and final)
- Track contract fulfillment

### For Administrators
- Approve and verify users
- Monitor all contracts
- Resolve disputes
- View analytics and platform activity
- Manage user accounts

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **React Toastify** - Notifications
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Razorpay** - Payment gateway integration
- **Nodemailer** - Email notifications

## 📁 Project Structure

```
S8project/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   ├── User.js          # User model
│   │   ├── Crop.js          # Crop listing model
│   │   ├── Contract.js      # Contract model
│   │   ├── Payment.js       # Payment model
│   │   └── Notification.js  # Notification model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── crops.js         # Crop management routes
│   │   ├── contracts.js    # Contract management routes
│   │   ├── payments.js     # Payment processing routes
│   │   ├── users.js      # User profile routes
│   │   ├── admin.js        # Admin routes
│   │   └── notifications.js # Notification routes
│   ├── utils/
│   │   ├── generateToken.js # JWT token generation
│   │   └── sendEmail.js     # Email utility
│   ├── server.js            # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── FarmerDashboard.jsx
│   │   │   ├── BuyerDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── Contracts.jsx
│   │   │   ├── ContractDetails.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── CropForm.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **npm** or **yarn**

### Quick start (one-command run)

From the **S8project/farmer** folder:

```bash
cd S8project/farmer
npm install
npm run setup
npm run install:all
npm run dev
```

- **Backend** runs at `http://localhost:5000`
- **Frontend** runs at `http://localhost:3000` (open this in your browser)

Ensure MongoDB is running locally or set `MONGODB_URI` in `backend/.env` (created by `npm run setup`).

### Installation (step by step)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd S8project/farmer
   ```

2. **Install root tooling and create env file**
   ```bash
   npm install
   npm run setup
   ```
   This creates `backend/.env` from `backend/.env.example`. Edit `backend/.env` to set `MONGODB_URI` and `JWT_SECRET` at minimum.

3. **Install backend and frontend dependencies**
   ```bash
   npm run install:all
   ```

4. **Environment configuration**

   If you didn’t use `npm run setup`, create `backend/.env` (see `backend/.env.example`). Required for local dev:
   - `MONGODB_URI` – e.g. `mongodb://localhost:27017/contract-farming` or your Atlas URI
   - `JWT_SECRET` – any long random string

### Running the Application

1. **Start MongoDB**
   - Local: start `mongod` or use MongoDB Atlas and set `MONGODB_URI` in `backend/.env`

2. **Start both backend and frontend**
   ```bash
   cd S8project/farmer
   npm run dev
   ```
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`

3. **Or run backend and frontend separately**
   - Terminal 1: `cd backend && npm run dev`
   - Terminal 2: `cd frontend && npm run dev`

4. **Access the application**
   - Open `http://localhost:3000` in your browser

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Crops
- `GET /api/crops` - Get all available crops (with filters)
- `GET /api/crops/:id` - Get single crop
- `POST /api/crops` - Create crop listing (Farmer only)
- `PUT /api/crops/:id` - Update crop listing (Farmer only)
- `DELETE /api/crops/:id` - Delete crop listing (Farmer only)
- `GET /api/crops/farmer/my-crops` - Get farmer's crops

### Contracts
- `GET /api/contracts` - Get all contracts (filtered by role)
- `GET /api/contracts/:id` - Get single contract
- `POST /api/contracts` - Create contract offer (Buyer only)
- `PUT /api/contracts/:id/accept` - Accept contract (Farmer only)
- `PUT /api/contracts/:id/reject` - Reject contract (Farmer only)
- `PUT /api/contracts/:id/sign` - Sign contract (Both parties)

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get single payment
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-documents` - Upload verification documents

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/verify` - Verify user
- `PUT /api/admin/users/:id/deactivate` - Deactivate user
- `GET /api/admin/contracts` - Get all contracts
- `PUT /api/admin/contracts/:id/resolve-dispute` - Resolve dispute

### Notifications
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password encryption
- **Role-Based Access Control** - Different permissions for farmers, buyers, and admins
- **Input Validation** - Express-validator for data validation
- **Contract Immutability** - Contracts cannot be modified once signed
- **Secure Payment Processing** - Razorpay integration with signature verification

## 🎨 UI/UX Features

- **Responsive Design** - Mobile-friendly interface
- **Modern UI** - Clean and intuitive design with Tailwind CSS
- **Smooth Animations** - Framer Motion for enhanced user experience
- **Agriculture-Friendly Theme** - Green and earthy color scheme
- **Real-time Notifications** - Toast notifications for user actions
- **Loading States** - Proper loading indicators
- **Error Handling** - User-friendly error messages

## 📊 Database Schema

### User
- Personal information (name, email, phone, address)
- Role (farmer, buyer, admin)
- Verification status
- Rating system
- Business details (for buyers)
- Farm details (for farmers)

### Crop
- Crop details (name, category, quantity, quality)
- Pricing information
- Harvest date
- Location
- Status tracking
- Associated contract

### Contract
- Parties (farmer, buyer)
- Crop details
- Pricing and payment terms
- Delivery date
- Digital signatures
- Status tracking
- Dispute handling

### Payment
- Contract association
- Payment type (advance, final, full)
- Amount and status
- Transaction details
- Razorpay integration

### Notification
- User association
- Notification type
- Message and title
- Read status
- Related entity

## 🚢 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in your hosting platform
2. Ensure MongoDB connection (MongoDB Atlas recommended)
3. Deploy using:
   ```bash
   npm start
   ```

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist` folder
3. Update API base URL in production

## 🧪 Testing

To test the application:

1. **Register as Farmer**
   - Create account with farmer role
   - Add crop listings
   - View contract offers

2. **Register as Buyer**
   - Create account with buyer role
   - Browse marketplace
   - Make contract offers

3. **Admin Access**
   - Create admin user manually in database
   - Verify users
   - Monitor contracts

## 📈 Future Enhancements

- [ ] Price history and analytics dashboard
- [ ] Advanced rating and review system
- [ ] Contract expiration alerts
- [ ] Downloadable contract PDF generation
- [ ] Multilingual support (English + Regional languages)
- [ ] Mobile app (React Native)
- [ ] Real-time chat between farmers and buyers
- [ ] Weather integration for harvest predictions
- [ ] Crop quality certification system
- [ ] Advanced search and filtering

## 🤝 Contributing

**Assured Contract Farming for Stable Market Access** is my 8th semester project where I built a full-stack platform connecting farmers and buyers directly with real-time communication and structured trading workflows. Through this project, I gained strong knowledge in full-stack development, system design, and building real-world applications focused on solving agricultural market challenges.


## 📄 License

This project is created for educational purposes as part of the Smart Agriculture Innovation Program.

**Built with ❤️ for farmers and buyers**







