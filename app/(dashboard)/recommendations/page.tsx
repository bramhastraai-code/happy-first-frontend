'use client';

import { useEffect } from 'react';
import { useRecommendationStore } from '@/lib/store/recommendationStore';

export default function RecommendationsPage() {
    const { recommendations, message, isLoading, fetchRecommendations } = useRecommendationStore();

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    if (isLoading && recommendations.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-gray-900 mb-4">Recommended for You</h1>
                <p className="text-xl text-gray-600">{message}</p>
            </div>

            {recommendations.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-500">No specific recommendations at the moment. Keep active!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition transform hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{rec.activity.name}</h3>
                                    <p className="text-sm text-gray-500">{rec.activity.description}</p>
                                </div>
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {Math.round(rec.score)}% Match
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-2">Why we recommend this:</p>
                                    <ul className="space-y-1">
                                        {rec.reasons.map((reason: string, i: number) => (
                                            <li key={i} className="flex items-center text-sm text-gray-600">
                                                <span className="mr-2 text-green-500">✓</span>
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-purple-50 rounded-xl p-4">
                                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Suggested Target</p>
                                    <p className="text-xl font-black text-purple-900">
                                        {rec.suggestedTarget} {rec.activity.baseUnit}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
