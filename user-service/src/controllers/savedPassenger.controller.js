const asyncHandler = require('../utils/asyncHandler');
const savedPassengerService = require('../services/savedPassenger.service');

exports.list = asyncHandler(async (req, res) => {
     const passengers = await savedPassengerService.list(req.user.id);
     res.status(200).json({ success: true, data: { passengers } });
});

exports.create = asyncHandler(async (req, res) => {
     const result = await savedPassengerService.create(req.user.id, req.body);
     res.status(result.created ? 201 : 200).json({
          success: true,
          message: result.created ? 'Passenger saved' : 'Passenger already saved',
          data: result,
     });
});

exports.update = asyncHandler(async (req, res) => {
     const passenger = await savedPassengerService.update(req.user.id, req.params.passengerId, req.body);
     res.status(200).json({ success: true, message: 'Saved passenger updated', data: { passenger } });
});

exports.remove = asyncHandler(async (req, res) => {
     await savedPassengerService.remove(req.user.id, req.params.passengerId);
     res.status(200).json({ success: true, message: 'Saved passenger deleted' });
});
