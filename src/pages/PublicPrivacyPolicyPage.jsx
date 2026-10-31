import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { BASE_URL } from '../api/adminApis';

export default function PublicPrivacyPolicyPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/config?tenant=demo&tenant_slug=demo`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setConfig(data.data);
        }
      })
      .catch((err) => console.error('Error loading config:', err))
      .finally(() => setLoading(false));
  }, []);

  const branding = config?.branding || {};
  const tenant = config?.tenant || {};
  const appName = branding.title || branding.platformName || branding.leaderName || tenant.name || 'मेरा मड़ियाहू';
  const privacyContent = branding.privacyPolicyContent;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight">गोपनीयता नीति (Privacy Policy)</h1>
              <p className="text-xs font-semibold text-gray-500">{appName}</p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Login Page</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <RefreshCw className="w-7 h-7 animate-spin text-orange-500" />
              <p className="text-xs font-medium">गोपनीयता नीति लोड हो रही है...</p>
            </div>
          ) : privacyContent ? (
            <div className="prose max-w-none text-gray-700 whitespace-pre-line text-sm sm:text-base leading-relaxed font-normal">
              {privacyContent}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              गोपनीयता नीति उपलब्ध नहीं है।
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500 font-medium">
        © {new Date().getFullYear()} {appName}. All Rights Reserved.
      </footer>
    </div>
  );
}

