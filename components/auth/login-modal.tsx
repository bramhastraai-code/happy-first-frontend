"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, LogIn, Phone, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore, useProfileStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [step, setStep] = useState<"form" | "loading">("form");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryCode, setCountryCode] = useState("91");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { setAuth } = useAuthStore();
    const { updateProfile } = useProfileStore();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setStep("loading");
        try {
            const response = await api.post("/api/userAuth/login", {
                phoneNumber: phoneNumber.replace(/\D/g, ""),
                countryCode,
                password,
            });

            if (response.success && response.data?.token) {
                setAuth(response.data.token);
                if (response.data?.user) {
                    const user = Array.isArray(response.data.user) ? response.data.user[0] : response.data.user;
                    updateProfile({
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        profileComplete: true,
                    });
                    localStorage.setItem("userData", JSON.stringify(user));
                }
                onClose();
                router.push("/dashboard");
            } else {
                setError(response.message || "Login failed. Please try again.");
                setStep("form");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during login");
            setStep("form");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <LogIn className="w-5 h-5 text-primary" /> Sign In to Your Account
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleLogin} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600">{error}</div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Country Code</label>
                        <div className="flex gap-2">
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-20"
                            >
                                <option value="91">+91</option>
                                <option value="1">+1</option>
                                <option value="44">+44</option>
                                <option value="61">+61</option>
                            </select>
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <input
                                    type="tel"
                                    placeholder="Phone number"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                    disabled={step === "loading"}
                                    className="flex-1 bg-transparent outline-none text-foreground text-sm placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={step === "loading"}
                                className="flex-1 bg-transparent outline-none text-foreground text-sm placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={step === "loading"} className="w-full bg-primary hover:bg-primary/90">
                        {step === "loading" ? "Signing In..." : "Sign In"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
