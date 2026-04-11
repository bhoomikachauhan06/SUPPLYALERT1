"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** This route (/risk-map) is a leftover — permanently redirect to /dashboard/risk-map */
export default function RiskMapRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/risk-map"); }, [router]);
  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="text-cyan-400 font-bold tracking-wider text-sm">Redirecting...</span>
      </div>
    </div>
  );
}
