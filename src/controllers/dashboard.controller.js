import { getDashboardOverviewService } from "../services/dashboard.services.js";

export const getDashboardOverview = async (req, res) => {
  try {
    // รับ query parameters จาก URL
    const { startDate, endDate, tz } = req.query;

    const result = await getDashboardOverviewService({
      startDate,
      endDate,
      tz,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Dashboard Data",
    });
  }
};
