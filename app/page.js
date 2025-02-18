'use client';

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-[pulse_3s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-xl animate-[pulse_3s_ease-in-out_infinite_0.7s]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-[pulse_3s_ease-in-out_infinite_1s]"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-2xl mx-auto backdrop-blur-md bg-slate-900/50 p-12 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 border border-blue-500/20">
          <h1 className="text-6xl font-bold text-white animate-[fadeIn_0.8s_ease-out]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-300">
              Welcome to Our App
            </span>
          </h1>
          
          <p className="text-xl text-blue-200 animate-[fadeIn_0.8s_ease-out_0.2s_forwards] opacity-0">
            Begin your journey with us
          </p>

          <Link 
            href="/login" 
            className="group relative inline-block px-8 py-4 text-lg font-semibold text-white overflow-hidden rounded-xl bg-blue-900/50 backdrop-blur-sm hover:bg-blue-800/60 transform hover:scale-105 transition-all duration-300 animate-[fadeIn_0.8s_ease-out_0.3s_forwards] opacity-0"
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </div>
      </div>
    </main>
  );
}
