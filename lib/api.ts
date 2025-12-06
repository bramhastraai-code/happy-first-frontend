import { axiosInstance } from "./axios"
import axios, { type AxiosInstance } from "axios"

export interface ApiResponse<T = any> {
    data?: T
    message?: string
    token?: string
}

export interface AuthApiResponse {
    data: {
        user: any
        token: string
    }
    message: string
}

class ApiClient {
    private axiosInstance: AxiosInstance

    constructor() {
        this.axiosInstance = axiosInstance
    }

    async post<T = any>(endpoint: string, payload: any, config?: any) {
        try {
            const response = await this.axiosInstance.post<T>(endpoint, payload, config)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async get<T = any>(endpoint: string, config?: any) {
        try {
            const response = await this.axiosInstance.get<T>(endpoint, config)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async register(payload: any) {
        try {
            const response = await this.axiosInstance.post<AuthApiResponse>("/userAuth/register", payload)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async verifyOtp(payload: { phoneNumber: string; countryCode: string; otp: string }) {
        try {
            const response = await this.axiosInstance.post<AuthApiResponse>("/userAuth/verify-otp", payload)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async updateProfile(payload: any) {
        try {
            const response = await this.axiosInstance.patch<ApiResponse>("/userAuth/update-profile", payload)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async getWeeklyPlan() {
        try {
            const response = await this.axiosInstance.get<ApiResponse>("/weeklyPlan/current")
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async getActivities() {
        try {
            const response = await this.axiosInstance.get<ApiResponse>("/weeklyPlan/options")
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async createWeeklyPlan(payload: any) {
        try {
            const response = await this.axiosInstance.post<ApiResponse>("/weeklyPlan/create", payload)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async submitDailyLog(activities: { activityId: string; value: number }[]) {
        try {
            const response = await this.axiosInstance.post<ApiResponse>("/dailyLog", { activities })
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async getSummary(period: 'daily' | 'weekly' = 'daily', date?: string) {
        try {
            const response = await this.axiosInstance.get<ApiResponse>(`/dailyLog/summary?period=${period}${date ? `&date=${date}` : ''}`)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async getLeaderboard(type: 'weekly' | 'all-time' | 'referral') {
        try {
            const response = await this.axiosInstance.get<ApiResponse>(`/leaderboard/${type}`)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async getRecommendations() {
        try {
            const response = await this.axiosInstance.get<ApiResponse>("/recommendations")
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    async login(payload: { phoneNumber: string; countryCode: string; password: string }) {
        try {
            const response = await this.axiosInstance.post<AuthApiResponse>("/userAuth/login", payload)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            return {
                success: false,
                error: this.handleError(error),
            }
        }
    }

    private handleError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.message || error.message || "API request failed"
        }
        return error instanceof Error ? error.message : "Unknown error"
    }
}

export const api = new ApiClient()
