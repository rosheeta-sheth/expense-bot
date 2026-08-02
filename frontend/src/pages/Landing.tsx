import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Camera, BarChart3, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading || user) {
    return null; // Wait for redirect or load
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-primary-600">
            <Wallet className="w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight">ExpenseBot</span>
          </div>
          <div>
            <Link
              to="/login"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors mr-6"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-lg hover:shadow-primary-500/30"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Smart Expense Tracking <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
              Powered by AI.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Snap a photo of your receipt and let our AI do the rest. Automatically extract, categorize, and track your spending in seconds with beautiful dashboards.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Start Tracking Free <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </main>

        {/* Features Section */}
        <section className="container mx-auto px-6 pb-32">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/40 transform transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Snap & Extract</h3>
              <p className="text-gray-600 leading-relaxed">
                Take a photo of any receipt. Our advanced OCR instantly extracts merchant names, dates, amounts, and itemized line items.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/40 transform transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Categorization</h3>
              <p className="text-gray-600 leading-relaxed">
                No more manual tagging. ExpenseBot uses AI to automatically categorize your spending and learns your habits over time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-white/40 transform transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="bg-green-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Budgets</h3>
              <p className="text-gray-600 leading-relaxed">
                Set monthly limits and watch your spending trends with beautiful interactive charts and real-time dashboard analytics.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200/60 bg-white/40 backdrop-blur-md">
          <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 text-gray-800 font-semibold mb-4 md:mb-0">
              <Wallet className="w-5 h-5 text-primary-600" />
              <span>ExpenseBot</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Your data is secure and encrypted.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
