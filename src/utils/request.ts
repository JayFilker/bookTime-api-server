import axios, { AxiosInstance } from 'axios';

const request: AxiosInstance = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

request.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err),
);

export default request;