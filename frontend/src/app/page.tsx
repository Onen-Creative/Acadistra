"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  Shield,
  Smartphone,
  Cloud,
  CheckCircle,
  MessageSquare,
  Heart,
  Briefcase,
  CreditCard,
  Send,
  BarChart3,
  Clock,
  Award,
  Building2,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";

interface School {
  id: string;
  name: string;
  logo_url: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Only redirect if user is actually logged in with valid token
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");

    if (user && token) {
      // Verify token is still valid before redirecting
      try {
        const userData = JSON.parse(user);
        if (userData && userData.id) {
          router.push("/dashboard");
          return; // Exit early to prevent loading landing page
        }
      } catch (e) {
        // Invalid user data, clear and stay on landing page
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
      }
    }

    // Fetch schools
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    fetch(`${apiUrl}/api/public/schools`)
      .then((res) => res.json())
      .then((data) => setSchools(data.schools || []))
      .catch((err) => console.error("Failed to fetch schools:", err));

    // Active section tracking
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = ["home", "features", "contact"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Multi-Section Support",
      description: "ECCE, P1-P7, S1-S6 with standardized curriculum subjects",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Role-Based Access",
      description: "Admin, Teacher, Bursar, Librarian, Nurse, Parent portals",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "UNEB & NCDC Grading",
      description: "Automated grading engines with PDF report generation",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Finance Management",
      description:
        "Fees tracking, payroll, budgets, requisitions & expenditure",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "SchoolPay Integration",
      description: "Real-time mobile money payments via SchoolPay Uganda",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "SMS Management",
      description: "Automated fees reminders & attendance alerts",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Attendance Tracking",
      description: "Daily attendance with holidays & term dates management",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Library Management",
      description: "Book cataloging, issues, returns & inventory tracking",
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Clinic Management",
      description: "Health profiles, medical records & clinic visits",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Payroll System",
      description: "Salary structures, monthly processing & payment tracking",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Real-time insights on performance, fees & attendance",
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Offline-First",
      description: "Marks entry works offline, syncs when online",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Parent Portal",
      description: "View children's progress, fees, attendance & reports",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance Analytics",
      description: "Class rankings, subject analysis & trend reports",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Audit Logging",
      description: "Complete activity tracking for security & compliance",
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Multi-Tenant",
      description: "Secure data isolation with subdomain routing",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        h1, h2, h3 {
          font-family: 'Playfair Display', serif;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-slide {
          animation: slide 30s linear infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>
      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/256784828791"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 group"
        aria-label="Chat on WhatsApp"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 group-hover:scale-110">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </div>
        </div>
      </a>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-amber-600 to-yellow-600 p-2.5 rounded-2xl">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Acadistra
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#home"
                className={`text-sm font-medium transition-all ${
                  activeSection === "home" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                Home
              </a>
              <a
                href="#features"
                className={`text-sm font-medium transition-all ${
                  activeSection === "features" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                Features
              </a>
              <a
                href="#contact"
                className={`text-sm font-medium transition-all ${
                  activeSection === "contact" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                Contact
              </a>
              <button
                onClick={() => router.push("/login")}
                className="relative group overflow-hidden bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-2.5 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-amber-500/50"
              >
                <span className="relative z-10">Login</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200">
            <div className="px-4 py-6 space-y-4">
              <a
                href="#home"
                className={`block text-base font-medium transition-all ${
                  activeSection === "home" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="#features"
                className={`block text-base font-medium transition-all ${
                  activeSection === "features" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#contact"
                className={`block text-base font-medium transition-all ${
                  activeSection === "contact" 
                    ? "text-amber-600 font-semibold" 
                    : "text-gray-700 hover:text-amber-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-3 rounded-full font-medium transition-all hover:shadow-lg"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-lime-50"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #d97706 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-amber-200 shadow-sm mb-8 hover-lift">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-800">Trusted by Schools Across Uganda</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your School
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-yellow-600 to-lime-600 bg-clip-text text-transparent">Into a Digital Powerhouse</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            The complete school management platform for <span className="font-semibold text-amber-700">Nursery → S6</span>. Real-time payments, automated alerts, and seamless operations—all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a
              href="#contact"
              className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all hover:shadow-2xl hover:shadow-amber-500/50 hover:scale-105"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Request a Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            <button
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto bg-white border-2 border-gray-300 text-gray-800 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:border-amber-400 hover:shadow-lg hover:scale-105"
            >
              Login to Dashboard
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8">
            {[
              { icon: Shield, text: 'UNEB & NCDC Compliant', color: 'text-emerald-600' },
              { icon: Zap, text: 'Real-time Sync', color: 'text-amber-600' },
              { icon: CheckCircle, text: 'Secure & Reliable', color: 'text-teal-600' },
              { icon: Award, text: '24/7 Support', color: 'text-indigo-600' },
            ].map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div key={index} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover-lift hover:shadow-md transition-all">
                  <Icon className={`w-5 h-5 ${badge.color}`} />
                  <span className="text-sm font-semibold text-gray-800">{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 relative overflow-hidden"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '3s' }}></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #78716c 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-amber-200 shadow-sm mb-6">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-800">Comprehensive Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Run Your School</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto font-light">
              Designed specifically for Ugandan schools, from nursery to senior six.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 bg-white rounded-3xl border border-gray-200 hover-lift hover:border-amber-300 hover:shadow-xl transition-all"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schools Section */}
      <section
        id="schools"
        className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 relative overflow-hidden"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #14b8a6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-teal-200 shadow-sm mb-6">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-gray-800">Trusted Partners</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Schools
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Across Uganda</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto font-light">
              Join growing institutions already using Acadistra to modernize their school management.
            </p>
          </div>

          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-8">
            {schools.length > 0 ? (
              schools.map((school) => (
                <div
                  key={school.id}
                  className="group relative bg-white border border-gray-200 p-8 rounded-3xl hover-lift hover:border-teal-300 hover:shadow-xl transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative w-28 h-28 mx-auto">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${school.logo_url}`}
                      alt="School logo"
                      className="w-full h-full object-contain transition-all duration-500"
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="%2314b8a6" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin"></div>
                  <span>Loading schools...</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Slider */}
          <div className="sm:hidden relative overflow-hidden py-8">
            <div
              className="flex animate-slide gap-6"
              style={{ width: "max-content" }}
            >
              {schools.length > 0 ? (
                [...schools, ...schools, ...schools].map((school, index) => (
                  <div
                    key={`${school.id}-${index}`}
                    className="flex-shrink-0 bg-white border border-gray-200 p-6 rounded-3xl shadow-sm"
                    style={{ width: "180px" }}
                  >
                    <div className="w-24 h-24 mx-auto relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${school.logo_url}`}
                        alt="School logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="%2314b8a6" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-8 text-gray-600">
                  Loading schools...
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-40 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-indigo-200 shadow-sm mb-6">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-800">Enterprise Technology</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Professional Technology
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">for Schools</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto font-light">
              Built with modern, reliable infrastructure designed for educational institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: 'Mobile-First & Offline-Ready',
                description: 'Works on any device. Marks entry continues offline and syncs automatically when online',
                gradient: 'from-cyan-500 to-teal-500',
              },
              {
                icon: Shield,
                title: 'Enterprise-Grade Security',
                description: 'Argon2 encryption, JWT authentication, role-based access, and complete audit trails',
                gradient: 'from-emerald-500 to-green-500',
              },
              {
                icon: Cloud,
                title: 'Cloud-Based & Scalable',
                description: 'Access anywhere, anytime. Automated daily backups and reliable uptime',
                gradient: 'from-indigo-500 to-purple-500',
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="group relative p-8 bg-white rounded-3xl border border-gray-200 hover-lift hover:border-indigo-300 hover:shadow-xl transition-all">
                  <div className="relative">
                    <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-center leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contact"
        className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-800 via-gray-800 to-zinc-800"
      >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-yellow-600/10 to-lime-600/10"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-white">Get Started Today</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Transform Your
            <br />
            School Operations?
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300 mb-12 font-light">
            Join leading schools using Acadistra. Get a personalized demo and see the difference.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a
              href="mailto:admin@acadistra.com"
              className="group w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-50 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Email Us
            </a>
            <a
              href="https://wa.me/256784828791"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              WhatsApp Us
            </a>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
            <p className="text-lg font-semibold text-white mb-6">Contact Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-300">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Send className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium text-white">admin@acadistra.com</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400">WhatsApp</p>
                  <p className="text-sm font-medium text-white">+256 784 828 791</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/10">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-400">Quick response during business hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur-md opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-amber-600 to-yellow-600 p-2 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold text-white">Acadistra</span>
              </div>
              <p className="text-sm leading-relaxed">
                Complete school management system for Ugandan schools (Nursery → S6)
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Why Acadistra</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#features" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Features
                  </a>
                </li>
                <li>
                  <a href="#schools" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Our Schools
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Case Studies
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:admin@acadistra.com"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Contact Sales
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/256784828791"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Support
                  </a>
                </li>
                <li>
                  <a href="/login" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Client Login
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" />
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:admin@acadistra.com"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center sm:text-left">
                &copy; {new Date().getFullYear()} Acadistra. All rights reserved. Built for Ugandan schools 🇺🇬
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  UNEB & NCDC Compliant
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
