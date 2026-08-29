const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const {
  getAllEvents,
  getEventDetails,
  createEvent,
  getMyEvents,
  deleteEvent,
} = require('../controllers/eventController');

router.route('/events').get(getAllEvents);
router.route('/events/mine').get(isAuthenticatedUser, authorizeRoles('seller'), getMyEvents);
router.route('/event/new').post(isAuthenticatedUser, authorizeRoles('seller'), createEvent);
router
  .route('/event/:id')
  .get(getEventDetails)
  .delete(isAuthenticatedUser, authorizeRoles('seller'), deleteEvent);

module.exports = router;
