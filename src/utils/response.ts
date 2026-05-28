
import { ApiResponse } from '../types/response.types';

export const success = <T>(data: T, message = '请求成功'): ApiResponse<T> => ({
  code: 200,
  message,
  data,
});

export const error = (message = '请求失败', code = 500): ApiResponse => ({
  code,
  message,
});
