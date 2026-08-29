const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Event = require('../models/Event');
const Shop = require('../models/Shop');

// @desc    Get all currently running/upcoming events
// @route   GET /api/v1/events
// @access  Public
exports.getAllEvents = catchAsyncErrors(async (req, res, next) => {
  const events = await Event.find({ endDate: { $gte: new Date() } })
    .populate('shop', 'name')
    .sort({ startDate: 1 });
  res.status(200).json({ success: true, count: events.length, events });
});

// @desc    Get a single event
// @route   GET /api/v1/event/:id
// @access  Public
exports.getEventDetails = catchAsyncErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate('shop', 'name ratings');
  if (!event) return next(new ErrorHandler('Event not found', 404));
  res.status(200).json({ success: true, event });
});

// @desc    Create a flash-sale event for the logged-in seller's shop
// @route   POST /api/v1/event/new
// @access  Private/Seller
exports.createEvent = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) return next(new ErrorHandler('Create your shop before adding an event', 400));

  const event = await Event.create({ ...req.body, shop: shop._id });
  res.status(201).json({ success: true, event });
});

// @desc    Get all events belonging to the logged-in seller's shop
// @route   GET /api/v1/events/mine
// @access  Private/Seller
exports.getMyEvents = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) return next(new ErrorHandler('You have not created a shop yet', 404));

  const events = await Event.find({ shop: shop._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, events });
});

// @desc    Delete an event (owner only)
// @route   DELETE /api/v1/event/:id
// @access  Private/Seller
exports.deleteEvent = catchAsyncErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new ErrorHandler('Event not found', 404));

  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop || String(event.shop) !== String(shop._id)) {
    return next(new ErrorHandler('You are not allowed to delete this event', 403));
  }

  await event.deleteOne();
  res.status(200).json({ success: true, message: 'Event deleted' });
});
