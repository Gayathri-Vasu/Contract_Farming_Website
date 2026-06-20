const express = require('express');
const Notification = require('../models/Notification');
const Contract = require('../models/Contract');
const Crop = require('../models/Crop');
const { protect } = require('../middleware/auth');
const hub = require('../utils/notifyHub');

const router = express.Router();
const jwt = require('jsonwebtoken');

// Public SSE route with token query for environments where headers aren't supported
router.get('/stream-token', (req, res) => {
  try {
    const raw = (req.query.token || '').toString();
    if (!raw) {
      return res.status(401).end();
    }
    let decoded;
    try {
      decoded = jwt.verify(raw, process.env.JWT_SECRET || 'dev-secret-key-change-me');
    } catch {
      return res.status(401).end();
    }
    const userId = decoded?.id;
    if (!userId) {
      return res.status(401).end();
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
    hub.addSubscriber(userId, res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {}
    }, 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      hub.removeSubscriber(userId, res);
      res.end();
    });
  } catch {
    try { res.status(500).end(); } catch {}
  }
});

// All other notification routes require authentication
router.use(protect);

// @route   GET /api/notifications/stream
// @desc    SSE stream for real-time notifications
// @access  Private
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

  hub.addSubscriber(req.user.id, res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    hub.removeSubscriber(req.user.id, res);
    res.end();
  });
});

// @route   POST /api/notifications
// @desc    Create a new notification
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { user, type, title, message, relatedId, relatedModel, requestedBy } = req.body;

    const notification = await Notification.create({
      user,
      type: type || 'system',
      title,
      message,
      relatedId,
      relatedModel,
      requestedBy: requestedBy || req.user.id,
      requestStatus: type === 'contract_request' ? 'pending' : undefined
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;
    const query = { user: req.user.id };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/:id/accept-request
// @desc    Accept a contract request
// @access  Private
router.put('/:id/accept-request', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this request'
      });
    }

    if (notification.type !== 'contract_request') {
      return res.status(400).json({
        success: false,
        message: 'This is not a contract request'
      });
    }

    notification.requestStatus = 'accepted';
    await notification.save();

    let acceptedContractId = null;

    // If this is a contract request tied to a crop, create a contract immediately
    // requestedBy is the buyer who initiated the request in FarmerCircle
    if (notification.relatedModel === 'Crop' && notification.relatedId && notification.requestedBy) {
      const crop = await Crop.findById(notification.relatedId);
      if (crop) {
        const farmerId = notification.user;
        const buyerId = notification.requestedBy;

        // Create an accepted contract from crop details
        const quantity = crop.quantity || 0;
        const pricePerUnit = crop.expectedPrice || 0;
        const totalAmount = quantity * pricePerUnit;

        const deliveryDate = crop.harvestDate || new Date();
        const contract = await Contract.create({
          createdBy: 'farmer',
          crop: crop._id,
          cropName: crop.name || 'Crop',
          cropGrade: crop.goodnessGrade || 'A',
          farmer: farmerId,
          buyer: buyerId,
          quantity: quantity,
          unit: crop.unit || 'kg',
          pricePerUnit: pricePerUnit,
          totalAmount: totalAmount,
          deliveryDate: deliveryDate,
          terms: crop.description || '',
          deliveryAddress: crop.location?.fullAddress || '',
          contractDuration: {
            startDate: new Date(),
            endDate: deliveryDate
          },
          status: 'accepted',
          acceptedAt: new Date()
        });

        acceptedContractId = contract._id;

        // Update crop linkage
        crop.status = 'contracted';
        crop.contractId = contract._id;
        await crop.save();

        // Notify buyer that contract has been created/accepted
        await Notification.create({
          user: buyerId,
          type: 'contract_accepted',
          title: 'Contract Accepted',
          message: 'Your request has been accepted and contract has been created',
          relatedId: contract._id,
          relatedModel: 'Contract'
        });
      }
    }
    // If this is a contract request tied to a buyer-created requirement,
    // accept the contract. Supports both:
    // - Buyer accepts a farmer's request
    // - Farmer accepts a buyer's request
    if (notification.relatedModel === 'Contract' && notification.relatedId && notification.requestedBy) {
      console.log('Processing contract request acceptance:', {
        notificationId: notification._id,
        relatedId: notification.relatedId,
        requestedBy: notification.requestedBy,
        userId: req.user.id
      });
      
      const contract = await Contract.findById(notification.relatedId).populate('buyer').populate('farmer');
      console.log('Found contract:', contract ? {
        id: contract._id,
        status: contract.status,
        buyer: contract.buyer,
        farmer: contract.farmer
      } : null);
      
      if (!contract) {
        console.log('Contract not found');
      } else {
        const buyerIdInContract = String(contract.buyer?._id || contract.buyer || '');
        const currentUserId = String(req.user.id);
        const requesterId = String(notification.requestedBy);

        // Always create a NEW contract from the buyer requirement, do not update existing
        const base = contract;
        const newContract = await Contract.create({
          createdBy: 'buyer',
          crop: base.crop || undefined,
          cropName: base.cropName || (base.crop?.name) || 'Crop',
          cropGrade: base.cropGrade || 'A',
          farmer: buyerIdInContract === currentUserId ? requesterId : currentUserId,
          buyer: buyerIdInContract || currentUserId,
          quantity: base.quantity || 0,
          unit: base.unit || 'kg',
          pricePerUnit: base.pricePerUnit || 0,
          totalAmount: (base.quantity || 0) * (base.pricePerUnit || 0),
          deliveryDate: base.deliveryDate || new Date(),
          terms: base.terms || '',
          deliveryAddress: base.deliveryAddress || '',
          contractDuration: {
            startDate: new Date(),
            endDate: base.deliveryDate || new Date()
          },
          status: 'accepted',
          acceptedAt: new Date(),
          messages: [],
          payments: []
        });

        acceptedContractId = newContract._id;

        // Notify the farmer who gets the contract (the requester)
        const notifyFarmerId = buyerIdInContract === currentUserId ? requesterId : currentUserId;
        await Notification.create({
          user: notifyFarmerId,
          type: 'contract_accepted',
          title: 'Contract Accepted',
          message: 'Your request has been accepted and contract has been created',
          relatedId: newContract._id,
          relatedModel: 'Contract'
        });
      }
    }

    res.json({
      success: true,
      message: 'Request accepted',
      data: {
        notification,
        acceptedContractId
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

// @route   PUT /api/notifications/:id/reject-request
// @desc    Reject a contract request
// @access  Private
router.put('/:id/reject-request', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this request'
      });
    }

    if (notification.type !== 'contract_request') {
      return res.status(400).json({
        success: false,
        message: 'This is not a contract request'
      });
    }

    notification.requestStatus = 'rejected';
    await notification.save();

    res.json({
      success: true,
      message: 'Request rejected',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
