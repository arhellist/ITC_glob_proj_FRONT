import { API_CONFIG } from '../../config/api.js';
import axiosAPI from '../auth/http/axios.js';

class CourseService {
  constructor() {
    this.baseURL = `${API_CONFIG.BASE_URL}/admin`;
  }

  async getCourseHistory({
    currency = 'USD',
    limit = 10,
    offset = 0,
    startDate,
    endDate
  } = {}) {
    const params = {
      currency,
      limit,
      offset
    };

    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }

    const response = await axiosAPI.get(`${this.baseURL}/course/history`, { params });
    return response.data?.data || {
      history: [],
      total: 0,
      limit,
      offset,
      hasMore: false,
      commission: {
        depositPercent: 0,
        withdrawalPercent: 0
      }
    };
  }
}

export default new CourseService();


