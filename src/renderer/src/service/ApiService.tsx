import axios, { AxiosInstance, AxiosResponse } from 'axios'

class ApiService {
  private client: AxiosInstance
  private baseUrl: string
  private static instance: ApiService
  private cachedToken: string | null = null

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/v1'
    this.client = axios.create({
      baseURL: this.baseUrl
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    )

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        console.log('[API Request]', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          data: config.data instanceof FormData ? '[FormData Contents]' : config.data
        })
        return config
      },
      (error) => {
        console.error('[API Request Error]', error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      (response) => {
        console.log('[API Response]', {
          url: response.config.url,
          status: response.status,
          data: response.data
        })
        return response
      },
      (error) => {
        console.error('[API Response Error]', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          error: error.message
        })
        return Promise.reject(error)
      }
    )
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  private async getToken(): Promise<string | null> {
    if (this.cachedToken) {
      return this.cachedToken
    }
    const token = localStorage.getItem('access_token')
    this.cachedToken = token
    return token
  }

  private async getHeaders(
    requiresAuth: boolean = true,
    isFormData: boolean = false
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {}

    // Only set Content-Type for JSON requests
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    if (requiresAuth) {
      const token = await this.getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data

      // Token error
      if (errorData?.success === false && errorData?.error === 'error_token') {
        this.clearToken()
        throw new Error('Session expired. Please login again.')
      }

      // Known error from API
      if (errorData?.error) {
        throw new Error(errorData.error)
      }

      // Default error based on status code
      switch (error.response?.status) {
        case 400:
          throw new Error('Invalid request')
        case 401:
          throw new Error('Please login to continue')
        case 403:
          throw new Error('You do not have permission to perform this action')
        case 404:
          throw new Error('Data not found')
        case 429:
          throw new Error('Too many requests. Please try again later')
        case 500:
          throw new Error('Server error. Please try again later')
        default:
          throw new Error('An error occurred. Please try again later')
      }
    }

    throw error
  }

  public async get<T>(
    endpoint: string,
    requiresAuth: boolean = true,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      const headers = await this.getHeaders(requiresAuth)
      const response: AxiosResponse<T> = await this.client.get(endpoint, {
        headers,
        params
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  public async post<T>(
    endpoint: string,
    data: any,
    requiresAuth: boolean = true,
    isFormData: boolean = false
  ): Promise<T> {
    try {
      const headers = await this.getHeaders(requiresAuth, isFormData)

      // Debug log for FormData
      if (isFormData && data instanceof FormData) {
        console.log('[FormData Contents]')
        for (const [key, value] of data.entries()) {
          if (value instanceof File) {
            console.log(`${key}:`, {
              name: value.name,
              type: value.type,
              size: value.size
            })
          } else {
            console.log(`${key}:`, value)
          }
        }
      }

      const config = {
        headers,
        // For FormData, let the browser handle everything
        ...(isFormData && {
          transformRequest: [(data: any) => data],
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          headers: {
            ...headers,
            'Content-Type': undefined // Let browser set this
          }
        })
      }

      const response: AxiosResponse<T> = await this.client.post(endpoint, data, config)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  public async put<T>(
    endpoint: string,
    data: any,
    requiresAuth: boolean = true,
    isFormData: boolean = false
  ): Promise<T> {
    try {
      const headers = await this.getHeaders(requiresAuth, isFormData)
      // Chỉ cấu hình đặc biệt nếu là FormData
      const config: any = { headers }
      if (isFormData && data instanceof FormData) {
        config.transformRequest = [(d: any) => d]
        config.maxBodyLength = Infinity
        config.maxContentLength = Infinity
        // Quan trọng: KHÔNG tự set Content-Type, để browser tự set boundary
        config.headers['Content-Type'] = undefined
        // Log FormData để debug
        console.log('[FormData Contents]')
        for (const [key, value] of data.entries()) {
          if (value instanceof File) {
            console.log(`${key}:`, {
              name: value.name,
              type: value.type,
              size: value.size
            })
          } else {
            console.log(`${key}:`, value)
          }
        }
      }
      const response: AxiosResponse<T> = await this.client.put(endpoint, data, config)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  public async delete<T>(endpoint: string, requiresAuth: boolean = true): Promise<T> {
    try {
      const headers = await this.getHeaders(requiresAuth)
      const response: AxiosResponse<T> = await this.client.delete(endpoint, {
        headers
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  public async saveToken(token: string): Promise<void> {
    this.cachedToken = token
    localStorage.setItem('access_token', token)
  }

  public async clearToken(): Promise<void> {
    this.cachedToken = null
    localStorage.removeItem('access_token')
  }
}

export default ApiService.getInstance()
