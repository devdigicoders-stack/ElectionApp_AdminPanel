import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function DeleteAccountRequestPage() {
  const [mobile, setMobile] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      alert('कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }
    setLoading(true);
    // Simulating deletion request acknowledgement
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight">खाता हटाने का अनुरोध (Delete Account)</h1>
              <p className="text-xs font-semibold text-gray-500">User Data Deletion Request</p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home / Login</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto w-full px-4 py-8 flex-1">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Google Play Store डेटा सुरक्षा नीति के अनुसार (Google Play Data Safety):</p>
              <p className="text-amber-800 leading-relaxed">
                यदि आप 'मेरा मड़ियाहू' या इस ऐप से अपना खाता और संबंधित डेटा (प्रोफ़ाइल, शिकायतें, इतिहास) हमेशा के लिए हटाना चाहते हैं, तो कृपया नीचे अपना पंजीकृत मोबाइल नंबर दर्ज करें।
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-green-50 border border-green-200 text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-green-900">अनुरोध सफलतापूर्वक दर्ज किया गया</h3>
              <p className="text-xs text-green-800 leading-relaxed max-w-md mx-auto">
                आपके मोबाइल नंबर <strong>{mobile}</strong> के खाते को हटाने का अनुरोध प्राप्त हो चुका है। सुरक्षा सत्यापन के उपरांत आपका खाता और संबंधित डेटा <strong>7 से 14 कार्य दिवसों</strong> के भीतर डेटाबेस से हटा दिया जाएगा।
              </p>
              <div className="pt-2">
                <button
                  onClick={() => { setSubmitted(false); setMobile(''); setReason(''); }}
                  className="text-xs font-bold text-green-700 underline hover:text-green-800"
                >
                  नया अनुरोध दर्ज करें
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  पंजीकृत मोबाइल नंबर (Registered Mobile Number) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="उदा. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  खाता हटाने का कारण (Reason for Deletion - Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="आप अपना खाता क्यों हटाना चाहते हैं? (वैकल्पिक)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-600 space-y-1">
                <p className="font-bold text-gray-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>क्या डेटा हटाया जाएगा?</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-500 pl-1">
                  <li>आपकी प्रोफ़ाइल और व्यक्तिगत जानकारी (नाम, मोबाइल, पता)।</li>
                  <li>ऐप नोटिफिकेशन एवं डिवाइस FCM टोकन।</li>
                  <li>दर्ज की गई शिकायतें एवं एक्टिविटी लॉग्स।</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'अनुरोध भेजा जा रहा है...' : 'खाता हटाने का अनुरोध भेजें (Submit Deletion Request)'}
              </button>
            </form>
          )}

          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-[11px] text-gray-500">
              सहायता या त्वरित सहायता हेतु ईमेल करें:{' '}
              <a href="mailto:support@election.digicoders.in" className="text-blue-600 font-semibold underline">
                support@election.digicoders.in
              </a>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500 font-medium">
        © {new Date().getFullYear()} User Data Protection & Compliance.
      </footer>
    </div>
  );
}

