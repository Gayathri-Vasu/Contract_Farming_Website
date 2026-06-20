const mongoose = require('mongoose');
const DigiContract = require('./DigiContract');
const User = require('./User');

const contractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    unique: true,
    required: true,
    default: () => `CF-${Date.now()}`
  },
  createdBy: {
    type: String,
    enum: ['buyer', 'farmer'],
    required: true
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: false // Optional for buyer-created contracts
  },
  cropName: {
    type: String,
    required: true,
    trim: true
  },
  cropGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For buyer-only requirements, farmer can be set later
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'quintal', 'ton', 'acre'],
    required: true
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  // String (legacy) or { en, ta, kn, te, ur } after translation
  terms: {
    type: mongoose.Schema.Types.Mixed
  },
  deliveryAddress: {
    type: mongoose.Schema.Types.Mixed
  },
  // Payment status snapshot for certificate-style views
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Released', null],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'active', 'paid', 'signed', 'completed', 'cancelled'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  // Messages array for real-time communication
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    // String (legacy) or { en, ta, kn, te, ur }
    message: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Payments array for payment history
  payments: [{
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    payerName: {
      type: String,
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiverName: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    time: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      default: 'GPay'
    }
  }],
  advancePayment: {
    amount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidAt: Date
  },
  finalPayment: {
    amount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidAt: Date
  },
  contractDuration: {
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true }
  },
  // Digital signatures
  farmerSignature: {
    signed: { type: Boolean, default: false },
    signedAt: Date,
    ipAddress: String
  },
  buyerSignature: {
    signed: { type: Boolean, default: false },
    signedAt: Date,
    ipAddress: String
  },
  // Top-level signature mirrors for convenience
  farmerSigned: { type: Boolean, default: false },
  farmerSignedDate: Date,
  buyerSigned: { type: Boolean, default: false },
  buyerSignedDate: Date,
  // Contract document
  contractDocument: {
    url: String,
    generatedAt: Date
  },
  // Dispute handling
  dispute: {
    raised: { type: Boolean, default: false },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    resolution: String,
    resolvedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastInteractedAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Keep updatedAt fresh
contractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
contractSchema.index({ farmer: 1, status: 1 });
contractSchema.index({ buyer: 1, status: 1 });
contractSchema.index({ status: 1, deliveryDate: 1 });

// Auto-generate DigiContract when contract becomes approved/accepted
contractSchema.post('save', async function (doc, next) {
  try {
    const status = (doc.status || '').toString().toLowerCase();
    if (status !== 'accepted' && status !== 'approved' && status !== 'active') {
      return next();
    }
    const exists = await DigiContract.findOne({ referenceContractId: doc._id }).lean();
    if (exists) {
      return next();
    }
    const [farmer, buyer] = await Promise.all([
      User.findById(doc.farmer).lean(),
      User.findById(doc.buyer).lean()
    ]);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const createdDate = `${dd}/${mm}/${yyyy}`;
    const createdTime = `${hh}:${min}:${ss}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const farmerInfo = {
      farmerId: doc.farmer?.toString() || (farmer?._id?.toString() || ''),
      name: farmer?.name || '',
      contact: farmer?.phone || farmer?.email || '',
      location: farmer?.address || ''
    };
    const buyerInfo = {
      buyerId: doc.buyer?.toString() || (buyer?._id?.toString() || ''),
      companyName: buyer?.businessName || buyer?.name || '',
      contact: buyer?.phone || buyer?.email || '',
      location: buyer?.address || ''
    };

    await DigiContract.create({
      referenceContractId: doc._id,
      farmer: farmerInfo,
      buyer: buyerInfo,
      product: {
        cropName: doc.cropName,
        quantity: doc.quantity,
        pricePerUnit: doc.pricePerUnit,
        totalAmount: doc.totalAmount,
        deliveryDate: doc.deliveryDate
      },
      createdDate,
      createdTime,
      timezone,
      paymentStatus: 'Pending',
      signatures: {
        farmerSigned: false,
        buyerSigned: false
      },
      status: 'Pending Signature'
    });
    next();
  } catch (e) {
    // Do not block contract save on digi-contract generation failure
    console.error('DigiContract auto-generation error:', e.message);
    next();
  }
});

module.exports = mongoose.model('Contract', contractSchema);

