const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const CheckLead = require('../models/CheckLead');

// Endpoint для получения статистики по уникальным кликам
router.get('/', async (req, res) => {
  try {
    const { app_id, startDate, endDate } = req.query;
    
    // Формируем фильтр по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Фильтр по app_id
    const appIdFilter = app_id ? { app_id } : {};

    // Статистика по track (Lead)
    const trackFilter = { ...appIdFilter, ...dateFilter };
    const totalTrackLeads = await Lead.countDocuments(trackFilter);
    
    // Уникальные клики по комбинации app_id + ip + userAgent
    const uniqueTrackClicks = await Lead.aggregate([
      { $match: trackFilter },
      {
        $group: {
          _id: {
            app_id: '$app_id',
            ip: '$ip',
            userAgent: '$userAgent'
          }
        }
      }
    ]);

    // Статистика по check (CheckLead)
    const checkFilter = { ...appIdFilter, ...dateFilter };
    const totalCheckLeads = await CheckLead.countDocuments(checkFilter);
    
    // Уникальные клики по комбинации app_id + ip + userAgent
    const uniqueCheckClicks = await CheckLead.aggregate([
      { $match: checkFilter },
      {
        $group: {
          _id: {
            app_id: '$app_id',
            ip: '$ip',
            userAgent: '$userAgent'
          }
        }
      }
    ]);
    
    const foundLeadsCount = await CheckLead.countDocuments({ ...checkFilter, foundLead: true });
    const notFoundLeadsCount = await CheckLead.countDocuments({ ...checkFilter, foundLead: false });

    // Статистика по app_id
    // Уникальные клики считаются по комбинации app_id + ip + userAgent
    const trackStatsByAppId = await Lead.aggregate([
      { $match: trackFilter },
      {
        $group: {
          _id: '$app_id',
          totalClicks: { $sum: 1 },
          uniqueCombinations: {
            $addToSet: {
              ip: '$ip',
              userAgent: '$userAgent'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalClicks: 1,
          uniqueClicks: { $size: '$uniqueCombinations' }
        }
      },
      { $sort: { totalClicks: -1 } }
    ]);

    const checkStatsByAppId = await CheckLead.aggregate([
      { $match: checkFilter },
      {
        $group: {
          _id: '$app_id',
          totalClicks: { $sum: 1 },
          uniqueCombinations: {
            $addToSet: {
              ip: '$ip',
              userAgent: '$userAgent'
            }
          },
          foundLeads: { $sum: { $cond: ['$foundLead', 1, 0] } },
          notFoundLeads: { $sum: { $cond: ['$foundLead', 0, 1] } }
        }
      },
      {
        $project: {
          _id: 1,
          totalClicks: 1,
          uniqueClicks: { $size: '$uniqueCombinations' },
          foundLeads: 1,
          notFoundLeads: 1
        }
      },
      { $sort: { totalClicks: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        track: {
          total: totalTrackLeads,
          unique: uniqueTrackClicks.length // Уникальные комбинации app_id + ip + userAgent
        },
        check: {
          total: totalCheckLeads,
          unique: uniqueCheckClicks.length, // Уникальные комбинации app_id + ip + userAgent
          found: foundLeadsCount,
          notFound: notFoundLeadsCount
        },
        byAppId: {
          track: trackStatsByAppId,
          check: checkStatsByAppId
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

