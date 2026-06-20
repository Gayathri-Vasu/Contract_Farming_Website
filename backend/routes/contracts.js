const express = require('express');

const { body, validationResult } = require('express-validator');

const Contract = require('../models/Contract');

const Crop = require('../models/Crop');

const Notification = require('../models/Notification');

const User = require('../models/User');

const { protect } = require('../middleware/auth');
const DigiContract = require('../models/DigiContract');

const { stringToI18nOrEmpty } = require('../services/translateService');



const router = express.Router();



// Helper to handle validation errors

const handleValidation = (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    res.status(400).json({ success: false, errors: errors.array() });

    return false;

  }

  return true;

};

router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view other user contracts'
      });
    }
    const contracts = await Contract.find({
      $or: [{ farmer: userId }, { buyer: userId }]
    })
      .populate('crop', 'name category quantity unit')
      .populate('farmer', 'name email phone')
      .populate('buyer', 'name email phone businessName');

    res.json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Local generator for contract IDs: CF-YYYYMMDD-XXXX
const generateContractId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CF-${y}${m}${d}-${rand}`;
};

// Ensure a DigiContract exists for a given Contract (aligned with DigiContract schema)
async function ensureDigiContractFor(contractDoc) {
  const exists = await DigiContract.findOne({ contract: contractDoc._id });
  if (exists) return exists;
  let cropName = contractDoc.cropName;
  if (!cropName && contractDoc.crop) {
    try {
      const crop = await Crop.findById(contractDoc.crop).lean();
      cropName = crop?.name || '';
    } catch {
      cropName = '';
    }
  }
  const contractId =
    contractDoc.contractId ||
    `DC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalAmount =
    typeof contractDoc.totalAmount === 'number'
      ? contractDoc.totalAmount
      : (Number(contractDoc.quantity) || 0) * (Number(contractDoc.pricePerUnit) || 0);
  return DigiContract.create({
    contract: contractDoc._id,
    contractId,
    farmer: contractDoc.farmer,
    buyer: contractDoc.buyer,
    crop: cropName || '',
    quantity: contractDoc.quantity,
    pricePerUnit: contractDoc.pricePerUnit,
    totalAmount,
    deliveryDate: contractDoc.deliveryDate,
    paymentStatus: 'Pending',
    status: 'Pending'
  });
}

// @route   POST /api/contracts/create
// @desc    Create a digi contract between farmer and buyer
// @access  Private
router.post(
  '/create',
  protect,
  [
    body('farmerId').notEmpty().withMessage('farmerId is required'),
    body('buyerId').notEmpty().withMessage('buyerId is required'),
    body('cropName').notEmpty().withMessage('cropName is required'),
    body('quantity').isNumeric().withMessage('quantity must be a number'),
    body('pricePerUnit').isNumeric().withMessage('pricePerUnit must be a number'),
    body('deliveryDate').isISO8601().withMessage('deliveryDate must be a valid date'),
    body('unit').optional().isString(),
    body('advancePaymentPercentage').optional().isFloat({ min: 0, max: 100 })
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;

      const {
        farmerId,
        buyerId,
        cropName,
        quantity,
        pricePerUnit,
        deliveryDate,
        advancePaymentPercentage,
        terms,
        deliveryAddress,
        unit
      } = req.body;

      const [farmer, buyer] = await Promise.all([
        User.findById(farmerId),
        User.findById(buyerId)
      ]);

      if (!farmer) {
        return res.status(404).json({ success: false, message: 'Farmer not found' });
      }
      if (!buyer) {
        return res.status(404).json({ success: false, message: 'Buyer not found' });
      }

      const qty = Number(quantity);
      const ppu = Number(pricePerUnit);
      const totalAmount = qty * ppu;
      const advPct =
        typeof advancePaymentPercentage === 'number'
          ? advancePaymentPercentage
          : advancePaymentPercentage !== undefined
          ? Number(advancePaymentPercentage)
          : undefined;
      const advanceAmount =
        typeof advPct === 'number' && !Number.isNaN(advPct)
          ? (totalAmount * advPct) / 100
          : 0;
      const finalAmount = Math.max(totalAmount - advanceAmount, 0);

      const [termsVal, deliveryVal] = await Promise.all([
        stringToI18nOrEmpty(terms),
        stringToI18nOrEmpty(deliveryAddress)
      ]);

      const payload = {
        contractId: generateContractId(),
        createdBy: req.user?.role === 'farmer' ? 'farmer' : 'buyer',
        cropName,
        cropGrade: 'A',
        farmer: farmer._id,
        buyer: buyer._id,
        quantity: qty,
        unit: unit || 'kg',
        pricePerUnit: ppu,
        totalAmount,
        deliveryDate: new Date(deliveryDate),
        terms: termsVal === undefined ? undefined : termsVal,
        deliveryAddress: deliveryVal === undefined ? undefined : deliveryVal,
        status: 'pending',
        advancePayment: {
          amount: advanceAmount
        },
        finalPayment: {
          amount: finalAmount
        }
      };

      const contract = await Contract.create(payload);

      try {
        await ensureDigiContractFor(contract);
      } catch (e) {
        console.error('DigiContract auto-gen (create) failed:', e.message);
      }

      return res.status(201).json({
        success: true,
        data: contract
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);



// @route   POST /api/contracts


// @access  Private (Buyer only)

router.post('/', protect, [

  body('cropId').notEmpty().withMessage('Crop ID is required'),

  body('quantity').isNumeric().withMessage('Quantity must be a number'),

  body('pricePerUnit').isNumeric().withMessage('Price per unit must be a number'),

  body('deliveryDate').isISO8601().withMessage('Delivery date must be a valid date')

], async (req, res) => {

  try {

    if (!handleValidation(req, res)) return;



    if (req.user.role !== 'buyer') {

      return res.status(403).json({

        success: false,

        message: 'Only buyers can create contract offers'

      });

    }



    const { cropId, quantity, pricePerUnit, deliveryDate, terms, advancePayment, cropGrade, deliveryAddress } = req.body;



    // Check if crop exists and is available

    const crop = await Crop.findById(cropId).populate('farmer');

    if (!crop) {

      return res.status(404).json({

        success: false,

        message: 'Crop not found'

      });

    }



    if (crop.status !== 'available') {

      return res.status(400).json({

        success: false,

        message: 'Crop is not available for contract'

      });

    }



    if (quantity > crop.quantity) {

      return res.status(400).json({

        success: false,

        message: 'Requested quantity exceeds available quantity'

      });

    }



    const totalAmount = quantity * pricePerUnit;

    const advanceAmount = advancePayment || 0;

    const [termsVal, deliveryVal] = await Promise.all([
      stringToI18nOrEmpty(terms),
      stringToI18nOrEmpty(deliveryAddress)
    ]);



    // Create contract

    const contract = await Contract.create({

      crop: cropId,

      farmer: crop.farmer._id,

      buyer: req.user.id,

      quantity,

      unit: crop.unit,

      pricePerUnit,

      totalAmount,

      advancePayment: {

        amount: advanceAmount

      },

      finalPayment: {

        amount: totalAmount - advanceAmount

      },

      deliveryDate,

      cropGrade: cropGrade || 'A',

      deliveryAddress: deliveryVal === undefined ? undefined : deliveryVal,

      contractDuration: {

        endDate: deliveryDate

      },

      terms: termsVal === undefined ? undefined : termsVal,

      status: 'pending',

      createdBy: 'buyer',

      cropName: crop.name,

      messages: [],

      payments: []

    });

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (buyer /) failed:', e.message);
    }



    // Update crop status

    crop.status = 'contracted';

    crop.contractId = contract._id;

    await crop.save();



    // Create notification for farmer

    await Notification.create({

      user: crop.farmer._id,

      type: 'contract_offer',

      title: 'New Contract Offer',

      message: `${req.user.name} has made a contract offer for your ${crop.name}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.status(201).json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   POST /api/contracts/requirements

// @desc    Buyer posts a generic crop requirement (no farmer / crop link yet)

// @access  Private (Buyer only)

router.post('/requirements', protect, [

  body('cropName').notEmpty().withMessage('Crop name is required'),

  body('quantity').isNumeric().withMessage('Quantity must be a number'),

  body('pricePerUnit').isNumeric().withMessage('Price per unit must be a number'),

  body('deliveryDate').isISO8601().withMessage('Delivery date must be a valid date'),

  body('unit').optional().isIn(['kg', 'quintal', 'ton', 'acre']).withMessage('Invalid unit')

], async (req, res) => {

  try {

    if (!handleValidation(req, res)) return;



    if (req.user.role !== 'buyer') {

      return res.status(403).json({

        success: false,

        message: 'Only buyers can create requirements'

      });

    }



    const {

      cropName,

      quantity,

      unit,

      pricePerUnit,

      deliveryDate,

      terms,

      advancePayment,

      cropGrade,

      deliveryAddress

    } = req.body;



    const totalAmount = quantity * pricePerUnit;

    const advanceAmount = advancePayment || 0;

    const [termsVal, deliveryVal] = await Promise.all([
      stringToI18nOrEmpty(terms),
      stringToI18nOrEmpty(deliveryAddress)
    ]);



    const contract = await Contract.create({

      createdBy: 'buyer',

      cropName,

      cropGrade: cropGrade || 'A',

      buyer: req.user.id,

      quantity,

      unit: unit || 'kg',

      pricePerUnit,

      totalAmount,

      advancePayment: {

        amount: advanceAmount

      },

      finalPayment: {

        amount: totalAmount - advanceAmount

      },

      deliveryDate,

      deliveryAddress: deliveryVal === undefined ? undefined : deliveryVal,

      contractDuration: {

        endDate: deliveryDate

      },

      terms: termsVal === undefined ? undefined : termsVal,

      status: 'pending',

      messages: [],

      payments: []

    });

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (requirements) failed:', e.message);
    }



    return res.status(201).json({

      success: true,

      data: contract

    });

  } catch (error) {

    console.error('Error creating buyer requirement contract:', error);

    return res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   GET /api/contracts/requirements

// @desc    Get all buyer-created requirements (common board)

// @access  Private (Farmer, Buyer, Admin)

router.get('/requirements', protect, async (req, res) => {

  try {

    const { status } = req.query;



    const query = {

      createdBy: 'buyer'

    };



    if (status) {

      query.status = new RegExp(`^${status}$`, 'i');

    }


    const contracts = await Contract.find(query)
      .populate('buyer', 'name email phone businessName businessType rating')
      .sort({ createdAt: -1 });



    return res.json({

      success: true,

      count: contracts.length,

      data: contracts

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/requirements/:id

// @desc    Update a buyer-created requirement (only by same buyer while pending)

// @access  Private (Buyer only)

router.put('/requirements/:id', protect, [

  body('cropName').notEmpty().withMessage('Crop name is required'),

  body('quantity').isNumeric().withMessage('Quantity must be a number'),

  body('pricePerUnit').isNumeric().withMessage('Price per unit must be a number'),

  body('deliveryDate').isISO8601().withMessage('Delivery date must be a valid date'),

  body('unit').optional().isIn(['kg', 'quintal', 'ton', 'acre']).withMessage('Invalid unit')

], async (req, res) => {

  try {

    if (!handleValidation(req, res)) return;



    const contract = await Contract.findById(req.params.id);



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Requirement not found'

      });

    }



    if (contract.createdBy !== 'buyer' || contract.buyer.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to update this requirement'

      });

    }



    if ((contract.status || '').toLowerCase() !== 'pending') {

      return res.status(400).json({

        success: false,

        message: 'Only pending requirements can be edited'

      });

    }



    const {

      cropName,

      quantity,

      unit,

      pricePerUnit,

      deliveryDate,

      terms,

      advancePayment,

      cropGrade,

      deliveryAddress

    } = req.body;



    const totalAmount = quantity * pricePerUnit;

    const advanceAmount = advancePayment || 0;

    const [termsVal, deliveryVal] = await Promise.all([
      stringToI18nOrEmpty(terms),
      stringToI18nOrEmpty(deliveryAddress)
    ]);



    contract.cropName = cropName;

    contract.quantity = quantity;

    contract.unit = unit || 'kg';

    contract.pricePerUnit = pricePerUnit;

    contract.totalAmount = totalAmount;

    contract.cropGrade = cropGrade || contract.cropGrade;

    contract.deliveryDate = deliveryDate;

    if (deliveryVal !== undefined) contract.deliveryAddress = deliveryVal;

    if (termsVal !== undefined) contract.terms = termsVal;

    contract.advancePayment = { amount: advanceAmount };

    contract.finalPayment = { amount: totalAmount - advanceAmount };



    await contract.save();



    return res.json({

      success: true,

      data: contract

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   DELETE /api/contracts/requirements/:id

// @desc    Delete a buyer-created requirement (only by same buyer)

// @access  Private (Buyer only)

router.delete('/requirements/:id', protect, async (req, res) => {

  try {

    const contract = await Contract.findById(req.params.id);



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Requirement not found'

      });

    }



    if (contract.createdBy !== 'buyer' || contract.buyer.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to delete this requirement'

      });

    }



    await contract.deleteOne();



    return res.json({

      success: true,

      message: 'Requirement removed successfully'

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   GET /api/contracts

// @desc    Get all contracts (filtered by user role and type)

// @access  Private

router.get('/', protect, async (req, res) => {

  try {

    let query = {};

    const { status, createdBy, type } = req.query;



    // Filter by user role - show all contracts where user is involved

    if (req.user.role === 'farmer') {

      query.farmer = req.user.id;

    } else if (req.user.role === 'buyer') {

      query.buyer = req.user.id;

    }



    // Filter by status

    if (status) {

      query.status = status;

    }



    // Filter by createdBy (buyer or farmer)

    if (createdBy) {

      query.createdBy = createdBy;

    }



    // Type filter: 'my-contracts', 'other-party-contracts', 'accepted'

    if (type === 'my-contracts') {

      // Contracts created by current user

      if (req.user.role === 'buyer') {

        query.createdBy = 'buyer';

        query.buyer = req.user.id;

      } else if (req.user.role === 'farmer') {

        query.createdBy = 'farmer';

        query.farmer = req.user.id;

      }

    } else if (type === 'other-party-contracts') {

      // Contracts created by other party (not created by current user)

      if (req.user.role === 'buyer') {

        query.createdBy = 'farmer';

        // Show contracts where current user is the buyer but farmer is different

        query.buyer = req.user.id;

        query.farmer = { $ne: req.user.id };

      } else if (req.user.role === 'farmer') {

        query.createdBy = 'buyer';

        // Show contracts where current user is the farmer but buyer is different

        query.farmer = req.user.id;

        query.buyer = { $ne: req.user.id };

      }

    } else if (type === 'accepted') {

      query.status = 'Accepted';

      // Also include Active and Paid contracts

      query.$or = [

        { status: 'Accepted' },

        { status: 'Active' },

        { status: 'Paid' }

      ];

      delete query.status;

    }



    // Buyer "My Contracts" should not include buyer-created requirements.
    // Those requirements are created without a farmer assigned yet.
    if (req.user.role === 'buyer') {
      query.$and = query.$and || [];
      query.$and.push({ farmer: { $exists: true, $ne: null } });
    }

    const contracts = await Contract.find(query)

      .populate('crop', 'name category quantity unit quality harvestDate')

      .populate('farmer', 'name email phone rating address')

      .populate('buyer', 'name email phone businessName businessType rating')

      .sort({ createdAt: -1 });



    res.json({

      success: true,

      count: contracts.length,

      data: contracts

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   GET /api/contracts/:id

// @desc    Get single contract by ID

// @access  Private

router.get('/:id', protect, async (req, res) => {

  try {

    const contract = await Contract.findById(req.params.id)
      .populate('crop')
      .populate('farmer', 'name email phone userId rating address')
      .populate('buyer', 'name email phone userId businessName businessType rating');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    // Check authorization

    if (req.user.role !== 'admin' && 

        contract.farmer._id.toString() !== req.user.id && 

        contract.buyer._id.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to view this contract'

      });

    }



    const c = contract.toObject();
    const total = typeof c.totalAmount === 'number' ? c.totalAmount : (Number(c.quantity) || 0) * (Number(c.pricePerUnit) || 0);
    const advAmt = c.advancePayment?.amount || 0;
    let paymentStatus = 'Pending';
    if (c.finalPayment?.paid) {
      paymentStatus = 'Released';
    } else if (c.advancePayment?.paid) {
      paymentStatus = 'Paid';
    }
    const agreement = {
      cropName: c.cropName || c.crop?.name,
      quantity: c.quantity,
      pricePerUnit: c.pricePerUnit,
      totalAmount: total,
      deliveryDate: c.deliveryDate,
      advancePaymentPercentage: total > 0 ? Math.round(((advAmt / total) * 100) * 100) / 100 : 0
    };
    const signatures = {
      farmerSigned: !!c.farmerSignature?.signed,
      farmerSignedDate: c.farmerSignature?.signedAt || null,
      buyerSigned: !!c.buyerSignature?.signed,
      buyerSignedDate: c.buyerSignature?.signedAt || null
    };
    res.json({
      success: true,
      data: {
        ...c,
        agreement,
        signatures,
        paymentStatus
      }
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/:id/accept

// @desc    Accept a contract offer

// @access  Private (Farmer only)

router.put('/:id/accept', protect, async (req, res) => {

  try {

    if (req.user.role !== 'farmer') {

      return res.status(403).json({

        success: false,

        message: 'Only farmers can accept contracts'

      });

    }



    const contract = await Contract.findById(req.params.id).populate('buyer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    if (contract.farmer.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to accept this contract'

      });

    }



    if ((contract.status || '').toString().toLowerCase() !== 'pending') {

      return res.status(400).json({

        success: false,

        message: 'Contract cannot be accepted in current status'

      });

    }



    contract.status = 'accepted';
    contract.acceptedAt = new Date();
    if (!contract.contractId) {
      contract.contractId = generateContractId();
    }
    const total = Number(contract.quantity || 0) * Number(contract.pricePerUnit || 0);
    contract.totalAmount = total;
    contract.paymentStatus = 'Pending';
    if (!contract.contractDocument) contract.contractDocument = {};
    contract.contractDocument.generatedAt = new Date();

    await contract.save();

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (farmer accept) failed:', e.message);
    }



    // Create notification for buyer

    await Notification.create({
      user: contract.buyer._id,
      type: 'contract_accepted',
      title: 'Contract Accepted',
      message: `Your contract offer has been accepted by ${req.user.name}`,
      relatedId: contract._id,
      relatedModel: 'Contract'
    });



    res.json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/:id/reject

// @desc    Reject a contract offer

// @access  Private (Farmer only)

router.put('/:id/reject', protect, async (req, res) => {

  try {

    if (req.user.role !== 'farmer') {

      return res.status(403).json({

        success: false,

        message: 'Only farmers can reject contracts'

      });

    }



    const contract = await Contract.findById(req.params.id).populate('crop').populate('buyer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    if (contract.farmer.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to reject this contract'

      });

    }



    if ((contract.status || '').toString().toLowerCase() !== 'pending') {

      return res.status(400).json({

        success: false,

        message: 'Contract cannot be rejected in current status'

      });

    }



    contract.status = 'Rejected';

    await contract.save();



    // Update crop status back to available

    const crop = await Crop.findById(contract.crop._id);

    if (crop) {

      crop.status = 'available';

      crop.contractId = null;

      await crop.save();

    }



    // Create notification for buyer

    await Notification.create({

      user: contract.buyer._id,

      type: 'system',

      title: 'Contract Rejected',

      message: `Your contract offer has been rejected by ${req.user.name}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.json({

      success: true,

      message: 'Contract rejected successfully'

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/:id/sign

// @desc    Sign a contract (digital signature)

// @access  Private

router.put('/:id/sign', protect, async (req, res) => {

  try {

    const contract = await Contract.findById(req.params.id).populate('buyer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    // Check authorization

    const isFarmer = contract.farmer.toString() === req.user.id;

    const isBuyer = contract.buyer._id.toString() === req.user.id;



    if (!isFarmer && !isBuyer) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to sign this contract'

      });

    }



    if (contract.status !== 'accepted') {

      return res.status(400).json({

        success: false,

        message: 'Contract must be accepted before signing'

      });

    }



    // Update signature

    if (isFarmer) {

      contract.farmerSignature = {

        signed: true,

        signedAt: new Date(),

        ipAddress: req.ip

      };

    } else {

      contract.buyerSignature = {

        signed: true,

        signedAt: new Date(),

        ipAddress: req.ip

      };

    }



    // If both parties have signed, update status

    if (contract.farmerSignature.signed && contract.buyerSignature.signed) {

      contract.status = 'signed';

    }



    await contract.save();



    // Create notification

    if (isFarmer) {

      await Notification.create({

        user: contract.buyer._id,

        type: 'contract_signed',

        title: 'Contract Signed',

        message: `${req.user.name} has signed the contract`,

        relatedId: contract._id,

        relatedModel: 'Contract'

      });

    } else {

      await Notification.create({

        user: contract.farmer,

        type: 'contract_signed',

        title: 'Contract Signed',

        message: `${req.user.name} has signed the contract`,

        relatedId: contract._id,

        relatedModel: 'Contract'

      });

    }



    res.json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});

// @route   POST /api/contracts/sign/:id
// @desc    Sign a contract by explicit role in body
// @access  Private
router.post(
  '/sign/:id',
  protect,
  [body('role').isIn(['farmer', 'buyer']).withMessage('role must be farmer or buyer')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { role } = req.body;
      const contract = await Contract.findById(req.params.id);
      if (!contract) {
        return res.status(404).json({ success: false, message: 'Contract not found' });
      }

      const now = new Date();
      if (role === 'farmer') {
        contract.farmerSignature = {
          ...(contract.farmerSignature || {}),
          signed: true,
          signedAt: now,
          ipAddress: req.ip
        };
      } else if (role === 'buyer') {
        contract.buyerSignature = {
          ...(contract.buyerSignature || {}),
          signed: true,
          signedAt: now,
          ipAddress: req.ip
        };
      }

      const fSigned = !!contract.farmerSignature?.signed;
      const bSigned = !!contract.buyerSignature?.signed;
      if (fSigned && bSigned) {
        contract.status = 'active';
      } else if (fSigned || bSigned) {
        // Map "Partially Signed" to existing enum 'signed'
        contract.status = 'signed';
      } else {
        contract.status = 'pending';
      }

      await contract.save();
      return res.json({ success: true, data: contract });
    } catch (error) {
      console.error('Error signing contract:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/contracts/sign/:id
// @desc    Sign a contract based on logged-in user's role
// @access  Private
router.put('/sign/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    const now = new Date();
    if (req.user.role === 'farmer') {
      contract.farmerSignature = { ...(contract.farmerSignature || {}), signed: true, signedAt: now, ipAddress: req.ip };
      contract.farmerSigned = true;
      contract.farmerSignedDate = now;
    } else if (req.user.role === 'buyer') {
      contract.buyerSignature = { ...(contract.buyerSignature || {}), signed: true, signedAt: now, ipAddress: req.ip };
      contract.buyerSigned = true;
      contract.buyerSignedDate = now;
    } else {
      return res.status(403).json({ success: false, message: 'Only farmer or buyer can sign' });
    }
    const f = !!contract.farmerSignature?.signed || contract.farmerSigned;
    const b = !!contract.buyerSignature?.signed || contract.buyerSigned;
    if (f && b) {
      contract.status = 'active';
    } else if (f || b) {
      contract.status = 'signed'; // partially signed
    } else {
      contract.status = 'pending';
    }
    await contract.save();
    return res.json({ success: true, data: contract });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});



// @route   POST /api/contracts/buyer-create

// @desc    Buyer creates a contract (posts required crop)

// @access  Private (Buyer only)

router.post('/buyer-create', protect, [

  body('cropName').notEmpty().withMessage('Crop name is required'),

  body('quantity').isNumeric().withMessage('Quantity must be a number'),

  body('pricePerUnit').isNumeric().withMessage('Price per unit must be a number'),

  body('deliveryDate').isISO8601().withMessage('Delivery date must be a valid date'),

  body('farmerId').notEmpty().withMessage('Farmer ID is required')

], async (req, res) => {

  try {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({ success: false, errors: errors.array() });

    }



    if (req.user.role !== 'buyer') {

      return res.status(403).json({

        success: false,

        message: 'Only buyers can create contracts'

      });

    }



    const { cropName, quantity, unit, pricePerUnit, deliveryDate, farmerId, terms, totalAmount, cropGrade, deliveryAddress } = req.body;



    // Verify farmer exists

    const farmer = await User.findById(farmerId);

    if (!farmer || farmer.role !== 'farmer') {

      return res.status(404).json({

        success: false,

        message: 'Farmer not found'

      });

    }

    const [termsVal, deliveryVal] = await Promise.all([
      stringToI18nOrEmpty(terms),
      stringToI18nOrEmpty(deliveryAddress)
    ]);



    // Create buyer-initiated contract

    const contract = await Contract.create({

      createdBy: 'buyer',

      cropName,

      cropGrade: cropGrade || 'A',

      farmer: farmerId,

      buyer: req.user.id,

      quantity,

      unit: unit || 'kg',

      pricePerUnit,

      totalAmount: totalAmount || (quantity * pricePerUnit),

      deliveryDate,

      deliveryAddress: deliveryVal === undefined ? undefined : deliveryVal,

      contractDuration: {

        endDate: deliveryDate

      },

      terms: termsVal === undefined ? undefined : termsVal,

      status: 'Pending',

      messages: [],

      payments: []

    });

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (buyer-create) failed:', e.message);
    }



    // Create notification for farmer

    await Notification.create({

      user: farmerId,

      type: 'contract_offer',

      title: 'New Contract Request',

      message: `${req.user.name} has posted a required crop: ${cropName}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.status(201).json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   POST /api/contracts/farmer-create

// @desc    Farmer creates a contract for their crop

// @access  Private (Farmer only)

router.post('/farmer-create', protect, [

  body('cropId').notEmpty().withMessage('Crop ID is required'),

  body('cropName').notEmpty().withMessage('Crop name is required'),

  body('quantity').isNumeric().withMessage('Quantity must be a number'),

  body('pricePerUnit').isNumeric().withMessage('Price per unit must be a number'),

  body('deliveryDate').isISO8601().withMessage('Delivery date must be a valid date'),

  body('buyerId').notEmpty().withMessage('Buyer ID is required')

], async (req, res) => {

  try {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({ success: false, errors: errors.array() });

    }



    if (req.user.role !== 'farmer') {

      return res.status(403).json({

        success: false,

        message: 'Only farmers can create contracts'

      });

    }



    const { cropId, cropName, quantity, unit, pricePerUnit, deliveryDate, buyerId, terms, totalAmount } = req.body;



    // Verify crop exists and belongs to farmer

    const crop = await Crop.findById(cropId);

    if (!crop) {

      return res.status(404).json({

        success: false,

        message: 'Crop not found'

      });

    }



    if (crop.farmer.toString() !== req.user.id) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to create contract for this crop'

      });

    }



    if (quantity > crop.quantity) {

      return res.status(400).json({

        success: false,

        message: 'Requested quantity exceeds available quantity'

      });

    }



    // Verify buyer exists

    const buyer = await User.findById(buyerId);

    if (!buyer || buyer.role !== 'buyer') {

      return res.status(404).json({

        success: false,

        message: 'Buyer not found'

      });

    }

    const termsVal = await stringToI18nOrEmpty(terms);



    // Create farmer-initiated contract

    const contract = await Contract.create({

      createdBy: 'farmer',

      crop: cropId,

      cropName,

      farmer: req.user.id,

      buyer: buyerId,

      quantity,

      unit: unit || crop.unit,

      pricePerUnit,

      totalAmount: totalAmount || (quantity * pricePerUnit),

      deliveryDate,

      contractDuration: {

        endDate: deliveryDate

      },

      terms: termsVal === undefined ? undefined : termsVal,

      status: 'Pending',

      messages: [],

      payments: []

    });

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (farmer-create) failed:', e.message);
    }



    // Update crop status

    crop.status = 'contracted';

    crop.contractId = contract._id;

    await crop.save();



    // Create notification for buyer

    await Notification.create({

      user: buyerId,

      type: 'contract_offer',

      title: 'New Contract Offer',

      message: `${req.user.name} has created a contract for ${cropName}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.status(201).json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/:id/accept

// @desc    Accept a contract (both buyer and farmer can accept)

// @access  Private

router.put('/:id/accept', protect, async (req, res) => {

  try {

    const contract = await Contract.findById(req.params.id)

      .populate('buyer')

      .populate('farmer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    // Check authorization

    const isFarmer = contract.farmer._id.toString() === req.user.id;

    const isBuyer = contract.buyer._id.toString() === req.user.id;



    if (!isFarmer && !isBuyer) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to accept this contract'

      });

    }



    const status = (contract.status || '').toString().toLowerCase();
    if (status !== 'pending') {

      return res.status(400).json({

        success: false,

        message: 'Contract cannot be accepted in current status'

      });

    }



    contract.status = 'accepted';
    contract.acceptedAt = new Date();
    if (!contract.contractId) {
      contract.contractId = generateContractId();
    }
    const total = Number(contract.quantity || 0) * Number(contract.pricePerUnit || 0);
    contract.totalAmount = total;
    contract.paymentStatus = 'Pending';
    if (!contract.contractDocument) contract.contractDocument = {};
    contract.contractDocument.generatedAt = new Date();

    await contract.save();

    try {
      await ensureDigiContractFor(contract);
    } catch (e) {
      console.error('DigiContract auto-gen (accept) failed:', e.message);
    }



    // Create notification for the other party


    const otherPartyId = isFarmer ? contract.buyer._id : contract.farmer._id;
    await Notification.create({
      user: otherPartyId,

      type: 'contract_accepted',

      title: 'Contract Accepted',
      message: `Contract has been accepted`,
      relatedId: contract._id,
      relatedModel: 'Contract'
    });
    res.json({

      success: true,

      data: contract

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   PUT /api/contracts/:id/reject

// @desc    Reject a contract (both buyer and farmer can reject)

// @access  Private

router.put('/:id/reject', protect, async (req, res) => {

  try {

    const contract = await Contract.findById(req.params.id)

      .populate('buyer')

      .populate('farmer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    // Check authorization

    const isFarmer = contract.farmer._id.toString() === req.user.id;

    const isBuyer = contract.buyer._id.toString() === req.user.id;



    if (!isFarmer && !isBuyer) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to reject this contract'

      });

    }



    if (contract.status !== 'Pending') {

      return res.status(400).json({

        success: false,

        message: 'Contract cannot be rejected in current status'

      });

    }



    contract.status = 'Rejected';

    await contract.save();



    // Update crop status back to available if farmer-initiated

    if (contract.crop && contract.createdBy === 'farmer') {

      const crop = await Crop.findById(contract.crop);

      if (crop) {

        crop.status = 'available';

        crop.contractId = null;

        await crop.save();

      }

    }



    // Create notification for the other party

    const otherPartyId = isFarmer ? contract.buyer._id : contract.farmer._id;

    await Notification.create({

      user: otherPartyId,

      type: 'system',

      title: 'Contract Rejected',

      message: `${req.user.name} has rejected the contract for ${contract.cropName}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.json({

      success: true,

      message: 'Contract rejected successfully'

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   POST /api/contracts/:id/messages

// @desc    Add a message to an accepted contract

// @access  Private

router.post('/:id/messages', protect, [

  body('message').notEmpty().withMessage('Message is required')

], async (req, res) => {

  try {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({ success: false, errors: errors.array() });

    }



    const contract = await Contract.findById(req.params.id);



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    // Check authorization

    const isFarmer = contract.farmer.toString() === req.user.id;

    const isBuyer = contract.buyer.toString() === req.user.id;



    if (!isFarmer && !isBuyer) {

      return res.status(403).json({

        success: false,

        message: 'Not authorized to send messages for this contract'

      });

    }



    // Add message (multilingual storage; input treated as English)

    const receiverId = String(contract.farmer) === String(req.user.id) ? contract.buyer : contract.farmer;
    const rawMsg =
      typeof req.body.message === 'string'
        ? req.body.message.trim()
        : String(req.body.message || '').trim();
    const messageI18n = await stringToI18nOrEmpty(rawMsg);
    const messageStored =
      messageI18n && typeof messageI18n === 'object' ? messageI18n : rawMsg;
    contract.messages.push({
      senderId: req.user.id,
      senderName: req.user.name,
      receiverId,
      isRead: false,
      message: messageStored,
      timestamp: new Date()
    });



    await contract.save();

    try {
      const otherPartyId = isFarmer ? contract.buyer.toString() : contract.farmer.toString();
      await Notification.create({
        user: otherPartyId,
        type: 'contract_message',
        title: 'New Contract Message',
        message: `${req.user.name} sent a new message on the contract`,
        relatedId: contract._id,
        relatedModel: 'Contract'
      });
    } catch (e) {
      // non-blocking
    }


    res.json({
      success: true,
      data: contract.messages[contract.messages.length - 1]
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



// @route   POST /api/contracts/:id/payments

// @desc    Make a payment for an accepted contract (simulated GPay)

// @access  Private

router.post('/:id/payments', protect, [

  body('amount').isNumeric().withMessage('Amount must be a number'),

  body('amount').custom((value) => {

    if (value <= 0) {

      throw new Error('Amount must be greater than 0');

    }

    return true;

  })

], async (req, res) => {

  try {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({ success: false, errors: errors.array() });

    }



    const contract = await Contract.findById(req.params.id)

      .populate('buyer')

      .populate('farmer');



    if (!contract) {

      return res.status(404).json({

        success: false,

        message: 'Contract not found'

      });

    }



    const payerRole = (contract.createdBy === 'farmer') ? 'buyer' : 'farmer'
    if (payerRole === 'buyer' && contract.buyer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the buyer can make payments' });
    }
    if (payerRole === 'farmer' && contract.farmer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the farmer can make payments' });
    }



    // Only allow payments for accepted contracts

    if (contract.status !== 'Accepted' && contract.status !== 'Active') {

      return res.status(400).json({

        success: false,

        message: 'Payments can only be made for accepted contracts'

      });

    }



    const { amount } = req.body;

    const now = new Date();

    const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });



    // Add payment

    contract.payments.push({

      payerId: req.user.id,

      payerName: req.user.name,

      receiverId: contract.farmer._id,

      receiverName: contract.farmer.name,

      amount: parseFloat(amount),

      date: now,

      time: timeString,

      paymentMethod: 'GPay'

    });



    // Update contract status if fully paid

    const totalPaid = contract.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= contract.totalAmount) {

      contract.status = 'Paid';

    } else if (contract.status === 'Accepted') {

      contract.status = 'Active';

    }



    await contract.save();



    // Create notification for farmer

    await Notification.create({

      user: contract.farmer._id,

      type: 'payment_received',

      title: 'Payment Received',

      message: `You received ₹${amount} from ${req.user.name} for contract ${contract.contractId}`,

      relatedId: contract._id,

      relatedModel: 'Contract'

    });



    res.json({

      success: true,

      message: 'Payment successful!',

      data: contract.payments[contract.payments.length - 1]

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: 'Server error',

      error: error.message

    });

  }

});



router.put('/:id/last-interacted', protect, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('buyer').populate('farmer');
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    const isFarmer = String(contract.farmer?._id || contract.farmer) === String(req.user.id);
    const isBuyer = String(contract.buyer?._id || contract.buyer) === String(req.user.id);
    if (!isFarmer && !isBuyer) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    contract.lastInteractedAt = new Date();
    await contract.save();
    return res.json({ success: true, data: { _id: String(contract._id), lastInteractedAt: contract.lastInteractedAt } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;



